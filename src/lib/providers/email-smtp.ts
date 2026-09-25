import "server-only";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { randomUUID } from "crypto";
import type { EmailProvider, InboxCredentials } from "./types";

/** Well-known SMTP/IMAP endpoints. Google/Microsoft use an app password (2-step verification required). */
export const PROVIDER_PRESETS: Record<string, { smtpHost: string; smtpPort: number; imapHost: string; imapPort: number }> = {
  GOOGLE: { smtpHost: "smtp.gmail.com", smtpPort: 465, imapHost: "imap.gmail.com", imapPort: 993 },
  MICROSOFT: { smtpHost: "smtp.office365.com", smtpPort: 587, imapHost: "outlook.office365.com", imapPort: 993 },
};

export function resolveEndpoints(c: InboxCredentials) {
  const preset = PROVIDER_PRESETS[c.provider];
  return {
    smtpHost: c.smtpHost || preset?.smtpHost,
    smtpPort: c.smtpPort || preset?.smtpPort || 587,
    imapHost: c.imapHost || preset?.imapHost,
    imapPort: c.imapPort || preset?.imapPort || 993,
    user: c.username || c.email,
    pass: c.password ?? "",
  };
}

function transport(c: InboxCredentials) {
  const e = resolveEndpoints(c);
  if (!e.smtpHost || !e.pass) throw new Error("SMTP host and password are required");
  return nodemailer.createTransport({
    host: e.smtpHost,
    port: e.smtpPort,
    secure: e.smtpPort === 465,
    requireTLS: e.smtpPort !== 465,
    auth: { user: e.user, pass: e.pass },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
  });
}

export function imapClient(c: InboxCredentials) {
  const e = resolveEndpoints(c);
  if (!e.imapHost) throw new Error("IMAP host is required to sync replies");
  return new ImapFlow({ host: e.imapHost, port: e.imapPort, secure: e.imapPort === 993, auth: { user: e.user, pass: e.pass }, logger: false, socketTimeout: 30_000 });
}

function friendly(err: unknown) {
  const m = err instanceof Error ? err.message : String(err);
  if (/535|auth|credentials|Invalid login|AUTHENTICATIONFAILED/i.test(m)) return "Authentication failed — check the email and app password";
  if (/ENOTFOUND|EAI_AGAIN/.test(m)) return "Mail server host not found";
  if (/ETIMEDOUT|ECONNREFUSED|timeout/i.test(m)) return "Could not reach the mail server (check host/port)";
  return m.slice(0, 200);
}

export const smtpEmail: EmailProvider = {
  name: "smtp",
  live: true,
  async testConnection(creds) {
    try {
      await transport(creds).verify();
    } catch (e) {
      return { ok: false, error: `SMTP: ${friendly(e)}` };
    }
    const imap = imapClient(creds);
    try {
      await imap.connect();
      await imap.logout();
    } catch (e) {
      return { ok: false, error: `IMAP: ${friendly(e)}` };
    }
    return { ok: true };
  },
  async send(creds, msg) {
    if (!creds) return { messageId: "", accepted: false, error: "Inbox has no stored credentials — reconnect it" };
    const domain = creds.email.split("@")[1] ?? "leadstabo.local";
    const messageId = `<${randomUUID()}@${domain}>`;
    try {
      const info = await transport(creds).sendMail({
        from: { name: msg.from.name, address: msg.from.email },
        to: msg.to.name ? { name: msg.to.name, address: msg.to.email } : msg.to.email,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        messageId,
        inReplyTo: msg.inReplyTo,
        references: msg.references,
        headers: { "List-Unsubscribe": `<mailto:${creds.email}?subject=unsubscribe>`, ...(msg.headers ?? {}) },
      });
      const rejected = (info.rejected ?? []).length > 0;
      return { messageId, accepted: !rejected, bounced: rejected, error: rejected ? "Recipient rejected by server" : undefined };
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      // 5xx on RCPT = hard bounce; anything else is a transient/infra failure.
      const hardBounce = /^5\d\d|55[0-4]|user unknown|does not exist|no such user/i.test(m) && !/535/.test(m);
      return { messageId, accepted: false, bounced: hardBounce, error: friendly(e) };
    }
  },
};
