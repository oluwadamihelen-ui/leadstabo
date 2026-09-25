import "server-only";
import { simpleParser, type ParsedMail } from "mailparser";
import type { Inbox } from "@prisma/client";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { emailProvider } from "@/lib/providers";
import { imapClient } from "@/lib/providers/email-smtp";
import type { InboxCredentials } from "@/lib/providers/types";
import { markBounced, recordInboundReply } from "./campaign-engine";
import { notify } from "./notifications";

const FIRST_SYNC_DAYS = 14;

/** Removes quoted history so only the prospect's new text is stored. */
export function stripQuoted(text: string) {
  const lines = text.replace(/\r/g, "").split("\n");
  const cut = lines.findIndex(
    (l) => /^On .{5,200} wrote:\s*$/.test(l) || /^-{2,}\s*Original Message\s*-{2,}/i.test(l) || /^From:\s.+/.test(l) || /^_{10,}$/.test(l) || /^>/.test(l),
  );
  return (cut > 0 ? lines.slice(0, cut) : lines).join("\n").trim().slice(0, 10_000);
}

function isBounce(m: ParsedMail) {
  const from = m.from?.value[0]?.address?.toLowerCase() ?? "";
  const ct = String(m.headers.get("content-type") ?? "");
  return /mailer-daemon|postmaster/.test(from) || /report-type=delivery-status/i.test(JSON.stringify(ct)) || /^(undeliverable|delivery status notification|mail delivery failed|returned mail)/i.test(m.subject ?? "");
}

function bounceDetails(m: ParsedMail) {
  const raw = `${m.text ?? ""}\n${m.html || ""}`;
  const failed = String(m.headers.get("x-failed-recipients") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const finals = Array.from(raw.matchAll(/(?:Final|Original)-Recipient:\s*rfc822;\s*<?([^\s>]+@[^\s>]+)>?/gi)).map((x) => x[1].toLowerCase());
  const loose = Array.from(raw.matchAll(/<([^\s<>@]+@[^\s<>]+\.[a-z]{2,})>/gi)).map((x) => x[1].toLowerCase());
  const messageIds = Array.from(raw.matchAll(/Message-ID:\s*(<[^>\s]+>)/gi)).map((x) => x[1]);
  return { recipients: Array.from(new Set([...failed, ...finals, ...loose])), messageIds };
}

export async function handleMessage(inbox: Inbox, m: ParsedMail) {
  const ws = inbox.workspaceId;
  const from = m.from?.value[0]?.address?.toLowerCase();
  if (!from || from === inbox.email.toLowerCase()) return null;

  if (isBounce(m)) {
    const { recipients, messageIds } = bounceDetails(m);
    let email = messageIds.length ? await db.email.findFirst({ where: { workspaceId: ws, messageId: { in: messageIds } } }) : null;
    if (!email && recipients.length) {
      email = await db.email.findFirst({ where: { workspaceId: ws, inboxId: inbox.id, lead: { email: { in: recipients } }, status: { in: ["DELIVERED", "SENT"] } }, orderBy: { sentAt: "desc" } });
    }
    if (email) {
      await markBounced(ws, email.id, m.date ?? new Date());
      return "bounce" as const;
    }
    return null;
  }

  // Reply: match by threading headers first, then by sender address.
  const refs = [m.inReplyTo, ...(Array.isArray(m.references) ? m.references : m.references ? [m.references] : [])].filter((x): x is string => !!x);
  let email = refs.length ? await db.email.findFirst({ where: { workspaceId: ws, messageId: { in: refs } }, orderBy: { sentAt: "desc" } }) : null;
  if (!email) email = await db.email.findFirst({ where: { workspaceId: ws, lead: { email: from } }, orderBy: { sentAt: "desc" } });
  if (!email) return null; // not a prospect — leave personal mail alone
  const body = stripQuoted(m.text ?? "") || "(no text content)";
  const convo = await recordInboundReply({
    workspaceId: ws,
    campaignId: email.campaignId,
    inboxId: inbox.id,
    emailId: email.id,
    leadId: email.leadId,
    subject: email.subject,
    body,
    receivedAt: m.date ?? new Date(),
    messageId: m.messageId ?? null,
  });
  return convo ? ("reply" as const) : null;
}

/** Pulls new messages from an inbox over IMAP and records replies and bounces. */
export async function syncInbox(inboxId: string): Promise<{ replies: number; bounces: number; error?: string }> {
  const inbox = await db.inbox.findUniqueOrThrow({ where: { id: inboxId } });
  if (emailProvider().name === "mock") return { replies: 0, bounces: 0 };
  if (!inbox.encryptedCredentials) return { replies: 0, bounces: 0, error: "No stored credentials — reconnect this inbox" };
  let creds: InboxCredentials;
  try {
    creds = JSON.parse(decrypt(inbox.encryptedCredentials));
  } catch {
    return { replies: 0, bounces: 0, error: "Stored credentials could not be decrypted — reconnect this inbox" };
  }

  const client = imapClient(creds);
  let replies = 0;
  let bounces = 0;
  let maxUid = inbox.imapLastUid ?? 0;
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const range = inbox.imapLastUid
        ? { uid: `${inbox.imapLastUid + 1}:*` }
        : { since: new Date(Date.now() - FIRST_SYNC_DAYS * 86400_000) };
      for await (const msg of client.fetch(range, { uid: true, source: true }, { uid: true })) {
        if (msg.uid <= (inbox.imapLastUid ?? 0) || !msg.source) continue;
        maxUid = Math.max(maxUid, msg.uid);
        try {
          const parsed = await simpleParser(msg.source);
          const r = await handleMessage(inbox, parsed);
          if (r === "reply") replies++;
          if (r === "bounce") bounces++;
        } catch (e) {
          console.error(`[sync] ${inbox.email} uid ${msg.uid}`, e);
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
    await db.inbox.update({ where: { id: inbox.id }, data: { imapLastUid: maxUid || null, lastSyncedAt: new Date(), lastError: null } });
    return { replies, bounces };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const auth = /auth|credentials|login/i.test(msg);
    const error = auth ? "IMAP authentication failed — reconnect this inbox" : `IMAP sync failed: ${msg.slice(0, 160)}`;
    await db.inbox.update({ where: { id: inbox.id }, data: { lastError: error, lastSyncedAt: new Date(), ...(auth ? { status: "ERROR" as const } : {}) } });
    if (auth && inbox.status !== "ERROR") {
      await notify(inbox.workspaceId, { type: "INBOX_DISCONNECTED", title: `${inbox.email} disconnected`, body: error, href: "/settings/infrastructure/inboxes" });
    }
    client.close();
    return { replies, bounces, error };
  }
}

/** Syncs every connected inbox that has credentials (worker / cron). */
export async function syncAllInboxes() {
  const inboxes = await db.inbox.findMany({ where: { status: { in: ["CONNECTED", "PAUSED"] }, encryptedCredentials: { not: null } }, select: { id: true } });
  let replies = 0;
  let bounces = 0;
  for (const i of inboxes) {
    const r = await syncInbox(i.id);
    replies += r.replies;
    bounces += r.bounces;
  }
  return { replies, bounces };
}
