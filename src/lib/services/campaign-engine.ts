import "server-only";
import type { Campaign, EmailStatus, Inbox, Lead, SequenceStep } from "@prisma/client";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { UserError } from "@/lib/errors";
import { aiProvider, emailProvider } from "@/lib/providers";
import type { InboxCredentials } from "@/lib/providers/types";
import { addDays, startOfDay } from "@/lib/utils";
import { notify } from "./notifications";
import { renderTemplate, variableMap } from "./personalization";

/** Only these verification states may receive campaign email. */
export const SENDABLE_STATUSES: EmailStatus[] = ["VALID", "CATCH_ALL"];

export async function launchCampaign(campaignId: string, workspaceId: string) {
  const c = await db.campaign.findFirst({
    where: { id: campaignId, workspaceId },
    include: { inbox: true, sequence: { include: { steps: true } }, leads: { include: { lead: true } } },
  });
  if (!c) throw new UserError("Campaign not found");
  if (!c.inbox) throw new UserError("Select a sending inbox before launching");
  if (c.inbox.status !== "CONNECTED") throw new UserError(`${c.inbox.email} is not connected`);
  if (!c.sequence || !c.sequence.steps.some((s) => s.enabled)) throw new UserError("Add at least one enabled email step");
  const eligible = c.leads.filter((cl) => SENDABLE_STATUSES.includes(cl.lead.emailStatus));
  if (!eligible.length) throw new UserError("No verified leads in this campaign — verify emails first");

  const now = new Date();
  await db.$transaction([
    db.campaignLead.updateMany({
      where: { campaignId, status: "QUEUED", lead: { emailStatus: { in: SENDABLE_STATUSES } } },
      data: { status: "IN_SEQUENCE", nextSendAt: now, currentStep: 0 },
    }),
    db.campaign.update({ where: { id: campaignId }, data: { status: "ACTIVE", launchedAt: c.launchedAt ?? now } }),
  ]);
  await notify(workspaceId, {
    type: "CAMPAIGN_LAUNCHED",
    title: `${c.name} is live`,
    body: `Sending to ${eligible.length} verified leads from ${c.inbox.email}.`,
    href: `/outreach/campaigns/${c.id}`,
  });
  return eligible.length;
}

function inWindow(c: Campaign, now: Date) {
  let hour = now.getUTCHours();
  try {
    hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: c.timezone }).format(now));
  } catch {
    /* invalid tz → UTC */
  }
  return hour >= c.sendWindowStart && hour < c.sendWindowEnd;
}

function credsFor(inbox: Inbox): InboxCredentials | null {
  if (!inbox.encryptedCredentials) return null;
  try {
    return JSON.parse(decrypt(inbox.encryptedCredentials)) as InboxCredentials;
  } catch {
    return null;
  }
}

/**
 * Sends every due sequence step across active campaigns, honouring send windows,
 * campaign daily caps and inbox daily limits. Safe to call repeatedly (worker/cron).
 */
export async function processDueSends(opts: { workspaceId?: string; force?: boolean; limit?: number } = {}) {
  const now = new Date();
  const today = startOfDay(now);
  const campaigns = await db.campaign.findMany({
    where: { status: "ACTIVE", ...(opts.workspaceId ? { workspaceId: opts.workspaceId } : {}) },
    include: { inbox: true, sequence: { include: { steps: { orderBy: { order: "asc" } } } }, workspace: { include: { members: { include: { user: true }, where: { role: "OWNER" } } } } },
  });
  let sent = 0;

  for (const c of campaigns) {
    if (!c.inbox || !c.sequence || c.inbox.status !== "CONNECTED") continue;
    if (!opts.force && !inWindow(c, now)) continue;
    const steps = c.sequence.steps.filter((s) => s.enabled);
    if (!steps.length) continue;

    // Reset the inbox counter at day boundaries.
    let inbox = c.inbox;
    if (!inbox.sentTodayDate || inbox.sentTodayDate < today) {
      inbox = await db.inbox.update({ where: { id: inbox.id }, data: { sentToday: 0, sentTodayDate: today } });
    }
    const sentByCampaignToday = await db.email.count({ where: { campaignId: c.id, sentAt: { gte: today } } });
    let budget = Math.min(c.dailyLimit - sentByCampaignToday, inbox.dailyLimit - inbox.sentToday, opts.limit ?? 500);
    if (budget <= 0) continue;

    const due = await db.campaignLead.findMany({
      where: { campaignId: c.id, status: "IN_SEQUENCE", nextSendAt: { lte: now } },
      include: { lead: { include: { company: true } } },
      orderBy: { nextSendAt: "asc" },
      take: budget,
    });
    const senderName = c.workspace.members[0]?.user.name ?? inbox.displayName;

    for (const cl of due) {
      if (budget-- <= 0) break;
      const step = steps[cl.currentStep];
      if (!step) {
        await db.campaignLead.update({ where: { id: cl.id }, data: { status: "COMPLETED", nextSendAt: null } });
        continue;
      }
      await sendStep(c, inbox, step, cl.id, cl.lead, senderName, cl.currentStep);
      sent++;
      const next = steps[cl.currentStep + 1];
      const current = await db.campaignLead.findUniqueOrThrow({ where: { id: cl.id } });
      if (current.status !== "IN_SEQUENCE") continue; // replied / bounced during send
      await db.campaignLead.update({
        where: { id: cl.id },
        data: next
          ? { currentStep: cl.currentStep + 1, nextSendAt: addDays(now, Math.max(1, next.delayDays - step.delayDays)) }
          : { status: "COMPLETED", nextSendAt: null, currentStep: cl.currentStep + 1 },
      });
    }
    await db.inbox.update({ where: { id: inbox.id }, data: { sentToday: { increment: due.length } } });

    const remaining = await db.campaignLead.count({ where: { campaignId: c.id, status: { in: ["QUEUED", "IN_SEQUENCE"] } } });
    if (remaining === 0) {
      await db.campaign.update({ where: { id: c.id }, data: { status: "COMPLETED", completedAt: now } });
      await notify(c.workspaceId, {
        type: "CAMPAIGN_COMPLETED",
        title: `${c.name} completed`,
        body: "Every lead has finished the sequence. Review results and replies.",
        href: `/outreach/campaigns/${c.id}`,
      });
    }
  }
  return { sent };
}

async function sendStep(
  c: Campaign,
  inbox: Inbox,
  step: SequenceStep,
  campaignLeadId: string,
  lead: Lead & { company: { name: string } | null },
  senderName: string,
  stepIndex: number,
) {
  const vars = variableMap(lead, senderName.split(" ")[0]);
  const subject = renderTemplate(step.subject, vars);
  const signature = inbox.signature ? `\n\n${inbox.signature}` : "";
  const body = renderTemplate(step.body, vars) + signature;
  const res = await emailProvider().send(credsFor(inbox), {
    from: { email: inbox.email, name: inbox.displayName },
    to: { email: lead.email, name: `${lead.firstName} ${lead.lastName}` },
    subject,
    text: body,
  });
  const now = new Date();
  const email = await db.email.create({
    data: {
      workspaceId: c.workspaceId,
      campaignId: c.id,
      leadId: lead.id,
      inboxId: inbox.id,
      stepId: step.id,
      subject,
      body,
      status: res.bounced ? "BOUNCED" : "DELIVERED",
      messageId: res.messageId,
      sentAt: now,
    },
  });
  const base = { workspaceId: c.workspaceId, emailId: email.id, campaignId: c.id, inboxId: inbox.id };
  await db.emailEvent.createMany({
    data: [
      { ...base, type: "SENT", occurredAt: now },
      { ...base, type: res.bounced ? "BOUNCED" : "DELIVERED", occurredAt: now },
    ],
  });
  await db.lead.update({ where: { id: lead.id }, data: { lastContactedAt: now } });
  await db.leadActivity.create({
    data: { leadId: lead.id, type: "emailed", description: `Step ${stepIndex + 1} sent from ${inbox.email}: “${subject}”` },
  });

  if (res.bounced) {
    await db.campaignLead.update({ where: { id: campaignLeadId }, data: { status: "BOUNCED", nextSendAt: null } });
    return;
  }
  if (emailProvider().name === "mock") await simulateEngagement(c, inbox, email.id, lead, subject, stepIndex);
}

const SAMPLE_REPLIES = [
  "Thanks for reaching out — this is actually timely. Can you send over a few times next week for a call?",
  "Interesting. How does pricing work for a team our size?",
  "Not interested at the moment, please remove me from your list.",
  "I'm out of the office until Monday with limited access to email. I'll respond when I'm back.",
  "Sounds good, tell me more. Who else in our space are you working with?",
  "Let's chat. Does Thursday at 2pm work? Send me a calendar invite.",
];

/** Mock-mode only: generates plausible opens/clicks/replies so analytics come alive. */
async function simulateEngagement(c: Campaign, inbox: Inbox, emailId: string, lead: Lead, subject: string, stepIndex: number) {
  const seed = (lead.email.length * 31 + stepIndex * 7) % 100;
  const base = { workspaceId: c.workspaceId, emailId, campaignId: c.id, inboxId: inbox.id };
  const later = (mins: number) => new Date(Date.now() + mins * 60_000);
  if (seed < 58) await db.emailEvent.create({ data: { ...base, type: "OPENED", occurredAt: later(20) } });
  if (seed < 9) await db.emailEvent.create({ data: { ...base, type: "CLICKED", occurredAt: later(25) } });
  if (seed < 11) {
    const body = SAMPLE_REPLIES[seed % SAMPLE_REPLIES.length];
    await recordInboundReply({ workspaceId: c.workspaceId, campaignId: c.id, inboxId: inbox.id, emailId, leadId: lead.id, subject, body });
  }
}

/** Stores an inbound reply: threads it, classifies it with AI, stops the sequence. */
export async function recordInboundReply(input: {
  workspaceId: string;
  campaignId: string | null;
  inboxId: string | null;
  emailId: string | null;
  leadId: string;
  subject: string;
  body: string;
  receivedAt?: Date;
}) {
  const receivedAt = input.receivedAt ?? new Date();
  const lead = await db.lead.findUniqueOrThrow({ where: { id: input.leadId }, include: { company: true } });
  const ai = aiProvider();
  const ctx = { lead: { firstName: lead.firstName, company: lead.company?.name ?? null, title: lead.title }, reply: input.body };
  const [cls, suggestion] = await Promise.all([ai.run("classify_reply", ctx), ai.run("suggest_response", ctx)]);
  const category = (cls.category ?? "UNCLASSIFIED") as
    | "POSITIVE" | "NEGATIVE" | "QUESTION" | "OUT_OF_OFFICE" | "INTERESTED" | "MEETING_REQUEST" | "UNCLASSIFIED";

  let convo = await db.conversation.findFirst({
    where: { workspaceId: input.workspaceId, leadId: input.leadId, campaignId: input.campaignId },
  });
  const label = category === "NEGATIVE" ? "NOT_INTERESTED" : category === "MEETING_REQUEST" ? "MEETING" : category === "INTERESTED" ? "INTERESTED" : undefined;
  if (!convo) {
    convo = await db.conversation.create({
      data: {
        workspaceId: input.workspaceId,
        leadId: input.leadId,
        campaignId: input.campaignId,
        inboxId: input.inboxId,
        subject: input.subject.startsWith("Re:") ? input.subject : `Re: ${input.subject}`,
        lastMessageAt: receivedAt,
        label: label ?? "NONE",
      },
    });
  } else {
    await db.conversation.update({
      where: { id: convo.id },
      data: { unread: true, archived: false, lastMessageAt: receivedAt, ...(label ? { label } : {}) },
    });
  }
  if (input.campaignId) {
    await db.email.updateMany({ where: { campaignId: input.campaignId, leadId: input.leadId, conversationId: null }, data: { conversationId: convo.id } });
  }
  await db.reply.create({
    data: {
      workspaceId: input.workspaceId,
      conversationId: convo.id,
      leadId: input.leadId,
      campaignId: input.campaignId,
      emailId: input.emailId,
      body: input.body,
      category,
      aiConfidence: cls.confidence ?? 0,
      suggestedResponse: suggestion.text ?? null,
      receivedAt,
    },
  });
  if (input.emailId) {
    await db.emailEvent.create({
      data: { workspaceId: input.workspaceId, emailId: input.emailId, campaignId: input.campaignId, inboxId: input.inboxId, type: "REPLIED", occurredAt: receivedAt },
    });
  }
  await db.lead.update({ where: { id: input.leadId }, data: { lastRepliedAt: receivedAt } });
  await db.leadActivity.create({ data: { leadId: input.leadId, type: "replied", description: `Replied (${category.replace(/_/g, " ").toLowerCase()})` } });
  if (input.campaignId && category !== "OUT_OF_OFFICE") {
    await db.campaignLead.updateMany({
      where: { campaignId: input.campaignId, leadId: input.leadId, status: "IN_SEQUENCE" },
      data: { status: "REPLIED", nextSendAt: null },
    });
  }
  if (["INTERESTED", "MEETING_REQUEST", "POSITIVE"].includes(category)) {
    await notify(input.workspaceId, {
      type: "POSITIVE_REPLY",
      title: `Positive reply from ${lead.firstName} ${lead.lastName}`,
      body: input.body.slice(0, 120),
      href: `/outreach/inbox?c=${convo.id}`,
    });
  }
  return convo;
}
