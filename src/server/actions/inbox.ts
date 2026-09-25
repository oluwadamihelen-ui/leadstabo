"use server";

import { z } from "zod";
import type { ConversationLabel } from "@prisma/client";
import { db } from "@/lib/db";
import { assertWorkspace } from "@/lib/auth/guard";
import { decrypt } from "@/lib/crypto";
import { emailProvider } from "@/lib/providers";
import type { InboxCredentials } from "@/lib/providers/types";
import { recordInboundReply } from "@/lib/services/campaign-engine";
import { id, requiredText } from "@/lib/validation";
import { run, UserError } from "../action";

async function own(workspaceId: string, conversationId: string) {
  const c = await db.conversation.findFirst({ where: { id: id.parse(conversationId), workspaceId }, include: { lead: true, inbox: true } });
  if (!c) throw new UserError("Conversation not found");
  return c;
}

export async function sendReply(conversationId: string, body: string) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const c = await own(ctx.workspaceId, conversationId);
    const text = requiredText("Reply", 20_000).parse(body);
    const inbox = c.inbox ?? (await db.inbox.findFirst({ where: { workspaceId: ctx.workspaceId, status: "CONNECTED" } }));
    if (!inbox) throw new UserError("Connect a sending inbox to reply");
    let creds: InboxCredentials | null = null;
    if (inbox.encryptedCredentials) {
      try {
        creds = JSON.parse(decrypt(inbox.encryptedCredentials));
      } catch {
        creds = null;
      }
    }
    const res = await emailProvider().send(creds, {
      from: { email: inbox.email, name: inbox.displayName },
      to: { email: c.lead.email, name: `${c.lead.firstName} ${c.lead.lastName}` },
      subject: c.subject,
      text,
    });
    const now = new Date();
    const email = await db.email.create({
      data: {
        workspaceId: ctx.workspaceId,
        campaignId: c.campaignId,
        leadId: c.leadId,
        inboxId: inbox.id,
        conversationId: c.id,
        subject: c.subject,
        body: text,
        status: res.accepted ? "DELIVERED" : "FAILED",
        messageId: res.messageId,
        sentAt: now,
      },
    });
    await db.emailEvent.createMany({
      data: [
        { workspaceId: ctx.workspaceId, emailId: email.id, campaignId: c.campaignId, inboxId: inbox.id, type: "SENT", occurredAt: now },
        { workspaceId: ctx.workspaceId, emailId: email.id, campaignId: c.campaignId, inboxId: inbox.id, type: "DELIVERED", occurredAt: now },
      ],
    });
    await db.conversation.update({ where: { id: c.id }, data: { replied: true, unread: false, lastMessageAt: now } });
    await db.reply.updateMany({ where: { conversationId: c.id }, data: { handled: true } });
    await db.lead.update({ where: { id: c.leadId }, data: { lastContactedAt: now } });
    await db.leadActivity.create({ data: { leadId: c.leadId, type: "emailed", description: `${ctx.user.name} replied from the inbox` } });
    return { ok: true as const, message: "Reply sent" };
  });
}

const LABELS = ["NONE", "INTERESTED", "MEETING", "NOT_INTERESTED", "BOUNCED"] as const;

export async function setConversationLabel(conversationId: string, label: ConversationLabel) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const c = await own(ctx.workspaceId, conversationId);
    const l = z.enum(LABELS).parse(label);
    await db.conversation.update({ where: { id: c.id }, data: { label: l } });
    if (l === "NOT_INTERESTED" && c.campaignId) {
      await db.campaignLead.updateMany({ where: { campaignId: c.campaignId, leadId: c.leadId, status: "IN_SEQUENCE" }, data: { status: "REPLIED", nextSendAt: null } });
    }
    await db.leadActivity.create({ data: { leadId: c.leadId, type: "label", description: `Marked ${l.replace("_", " ").toLowerCase()} by ${ctx.user.name}` } });
    return { ok: true as const, message: l === "NONE" ? "Label cleared" : `Marked ${l.replace("_", " ").toLowerCase()}` };
  });
}

export async function setConversationRead(conversationId: string, read: boolean) {
  return run(async () => {
    const ctx = await assertWorkspace("VIEWER");
    const c = await own(ctx.workspaceId, conversationId);
    await db.conversation.update({ where: { id: c.id }, data: { unread: !read } });
    return { ok: true as const };
  });
}

export async function archiveConversation(conversationId: string, archived: boolean) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const c = await own(ctx.workspaceId, conversationId);
    await db.conversation.update({ where: { id: c.id }, data: { archived, unread: false } });
    return { ok: true as const, message: archived ? "Archived" : "Moved to inbox" };
  });
}

export async function bookMeeting(conversationId: string, when: string) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const c = await own(ctx.workspaceId, conversationId);
    const at = new Date(z.string().min(10).max(40).parse(when));
    if (Number.isNaN(at.getTime())) throw new UserError("Pick a valid date and time");
    await db.conversation.update({ where: { id: c.id }, data: { label: "MEETING", meetingAt: at } });
    await db.leadActivity.create({ data: { leadId: c.leadId, type: "meeting", description: `Meeting booked for ${at.toUTCString()}` } });
    return { ok: true as const, message: "Meeting booked" };
  });
}

/** Mock-mode helper: injects an inbound reply so the AI classification flow can be demoed. */
export async function simulateInboundReply(conversationId: string, body: string) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    if (emailProvider().name !== "mock") throw new UserError("Only available with the mock email provider");
    const c = await own(ctx.workspaceId, conversationId);
    const lastEmail = await db.email.findFirst({ where: { conversationId: c.id }, orderBy: { sentAt: "desc" } });
    await recordInboundReply({
      workspaceId: ctx.workspaceId,
      campaignId: c.campaignId,
      inboxId: c.inboxId,
      emailId: lastEmail?.id ?? null,
      leadId: c.leadId,
      subject: c.subject,
      body: requiredText("Reply", 5000).parse(body),
    });
    return { ok: true as const, message: "Inbound reply received & classified" };
  });
}

const CATEGORIES = ["POSITIVE", "NEGATIVE", "QUESTION", "OUT_OF_OFFICE", "INTERESTED", "MEETING_REQUEST", "UNCLASSIFIED"] as const;

export async function reclassifyReply(replyId: string, category: (typeof CATEGORIES)[number]) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const cat = z.enum(CATEGORIES).parse(category);
    const { count } = await db.reply.updateMany({ where: { id: id.parse(replyId), workspaceId: ctx.workspaceId }, data: { category: cat, aiConfidence: 1 } });
    if (!count) throw new UserError("Reply not found");
    return { ok: true as const, message: "Reply reclassified" };
  });
}

export async function markReplyHandled(replyId: string, handled: boolean) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const { count } = await db.reply.updateMany({ where: { id: id.parse(replyId), workspaceId: ctx.workspaceId }, data: { handled } });
    if (!count) throw new UserError("Reply not found");
    return { ok: true as const, message: handled ? "Marked handled" : "Marked open" };
  });
}
