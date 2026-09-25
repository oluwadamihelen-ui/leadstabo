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
import { buildEmailHtml, toPlainText } from "@/lib/email-html";
import { clickUrl, openPixelUrl } from "@/lib/tracking";
import { readOutreachSettings, type OutreachSettings } from "@/lib/outreach-settings";

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

function inWindow(c: Campaign, now: Date, skipWeekends: boolean) {
  let hour = now.getUTCHours();
  let weekday = now.getUTCDay();
  try {
    const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", weekday: "short", timeZone: c.timezone }).formatToParts(now);
    hour = Number(parts.find((p) => p.type === "hour")?.value ?? hour);
    weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.find((p) => p.type === "weekday")?.value ?? "");
  } catch {
    /* invalid tz → UTC */
  }
  if (skipWeekends && (weekday === 0 || weekday === 6)) return false;
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
    include: {
      inbox: true,
      sequence: { include: { steps: { orderBy: { order: "asc" } } } },
      workspace: { include: { members: { include: { user: true }, where: { role: "OWNER" } } } },
    },
  });
  let sent = 0;
  let failures = 0;

  for (const c of campaigns) {
    if (!c.inbox || !c.sequence || c.inbox.status !== "CONNECTED") continue;
    if (!c.inbox.encryptedCredentials && emailProvider().live) {
      // Demo/seeded inbox with no mailbox behind it — nothing can be sent until it's reconnected.
      const msg = "No mailbox connected — add this inbox’s app password to send";
      if (c.inbox.lastError !== msg) await db.inbox.update({ where: { id: c.inbox.id }, data: { lastError: msg } });
      continue;
    }
    const settings = readOutreachSettings(c.workspace.outreachSettings);
    if (!opts.force && !inWindow(c, now, settings.skipWeekends)) continue;
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
      const r = await sendStep(c, inbox, step, cl.id, cl.lead, senderName, cl.currentStep, settings);
      if (r.outcome === "failed") {
        // Leave the lead scheduled so it retries on the next tick; stop this inbox on auth/connection errors.
        failures++;
        await db.inbox.update({ where: { id: inbox.id }, data: { lastError: r.error ?? "Send failed" } });
        if (/Authentication|credentials|reconnect|reach the mail server|host not found/i.test(r.error ?? "")) {
          await db.inbox.update({ where: { id: inbox.id }, data: { status: "ERROR" } });
          await notify(c.workspaceId, {
            type: "INBOX_DISCONNECTED",
            title: `${inbox.email} can’t send`,
            body: `${r.error}. Campaign “${c.name}” is waiting — reconnect the inbox.`,
            href: "/settings/infrastructure/inboxes",
          });
          break;
        }
        continue;
      }
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
    const attempted = await db.email.count({ where: { inboxId: inbox.id, campaignId: c.id, sentAt: { gte: today } } });
    await db.inbox.update({ where: { id: inbox.id }, data: { sentToday: Math.max(inbox.sentToday, attempted) } });
    await refreshInboxHealth(inbox.id, c.workspaceId, settings.bounceThreshold);

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
  return { sent, failures };
}

type StepOutcome = "sent" | "bounced" | "failed";

async function sendStep(
  c: Campaign,
  inbox: Inbox,
  step: SequenceStep,
  campaignLeadId: string,
  lead: Lead & { company: { name: string } | null },
  senderName: string,
  stepIndex: number,
  settings: OutreachSettings,
): Promise<{ outcome: StepOutcome; error?: string }> {
  const vars = variableMap(lead, senderName.split(" ")[0]);
  const subject = renderTemplate(step.subject, vars);
  const signature = inbox.signature ? `\n\n${inbox.signature}` : "";
  const footer = settings.unsubscribeFooter ? `\n\n${settings.unsubscribeFooter}` : "";
  const body = renderTemplate(step.body, vars) + signature + footer;

  // Follow-ups thread under the previous email to this lead.
  const previous = await db.email.findFirst({
    where: { campaignId: c.id, leadId: lead.id, messageId: { not: null }, status: { not: "FAILED" } },
    orderBy: { sentAt: "desc" },
  });
  const email = await db.email.create({
    data: { workspaceId: c.workspaceId, campaignId: c.id, leadId: lead.id, inboxId: inbox.id, stepId: step.id, subject, body: toPlainText(body), status: "SCHEDULED" },
  });
  const html = buildEmailHtml(body, {
    pixelUrl: c.trackOpens ? openPixelUrl(email.id) : undefined,
    rewriteLink: settings.trackClicks ? (u) => clickUrl(email.id, u) : undefined,
  });
  const res = await emailProvider().send(credsFor(inbox), {
    from: { email: inbox.email, name: inbox.displayName },
    to: { email: lead.email, name: `${lead.firstName} ${lead.lastName}`.trim() },
    subject,
    text: toPlainText(body),
    html,
    inReplyTo: previous?.messageId ?? undefined,
    references: previous?.messageId ? [previous.messageId] : undefined,
  });
  const now = new Date();

  if (!res.accepted && !res.bounced) {
    // Nothing left the building — drop the row so the retry doesn't duplicate it.
    await db.email.delete({ where: { id: email.id } });
    return { outcome: "failed", error: res.error };
  }

  await db.email.update({ where: { id: email.id }, data: { status: res.bounced ? "BOUNCED" : "DELIVERED", messageId: res.messageId, sentAt: now } });
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
    await markBounced(c.workspaceId, email.id);
    return { outcome: "bounced" };
  }
  if (emailProvider().name === "mock") await simulateEngagement(c, inbox, email.id, lead, subject, stepIndex);
  return { outcome: "sent" };
}

/** Marks an email as hard-bounced: stops the sequence, flags the lead and files it in the Bounced folder. */
export async function markBounced(workspaceId: string, emailId: string, occurredAt = new Date()) {
  const email = await db.email.findFirst({ where: { id: emailId, workspaceId } });
  if (!email) return;
  await db.email.update({ where: { id: email.id }, data: { status: "BOUNCED" } });
  const already = await db.emailEvent.findFirst({ where: { emailId: email.id, type: "BOUNCED" } });
  if (!already) {
    await db.emailEvent.create({ data: { workspaceId, emailId: email.id, campaignId: email.campaignId, inboxId: email.inboxId, type: "BOUNCED", occurredAt } });
  }
  if (email.campaignId) {
    await db.campaignLead.updateMany({ where: { campaignId: email.campaignId, leadId: email.leadId }, data: { status: "BOUNCED", nextSendAt: null } });
  }
  await db.lead.update({ where: { id: email.leadId }, data: { emailStatus: "INVALID" } });
  if (!email.conversationId) {
    const convo = await db.conversation.create({
      data: { workspaceId, leadId: email.leadId, campaignId: email.campaignId, inboxId: email.inboxId, subject: `Undeliverable: ${email.subject}`, label: "BOUNCED", unread: false, lastMessageAt: occurredAt },
    });
    await db.email.update({ where: { id: email.id }, data: { conversationId: convo.id } });
  }
}

/** Recomputes 7-day bounce rate; auto-pauses the inbox past the workspace threshold. */
async function refreshInboxHealth(inboxId: string, workspaceId: string, threshold: number) {
  const since = addDays(new Date(), -7);
  const [sent, bounced] = await Promise.all([
    db.email.count({ where: { inboxId, sentAt: { gte: since } } }),
    db.email.count({ where: { inboxId, sentAt: { gte: since }, status: "BOUNCED" } }),
  ]);
  if (!sent) return;
  const bounceRate = Math.round((bounced / sent) * 1000) / 10;
  const inbox = await db.inbox.update({
    where: { id: inboxId },
    data: { bounceRate, healthScore: Math.max(20, Math.round(100 - bounceRate * 8)) },
  });
  if (sent >= 20 && bounceRate > threshold && inbox.status === "CONNECTED") {
    await db.inbox.update({ where: { id: inboxId }, data: { status: "PAUSED" } });
    await notify(workspaceId, {
      type: "BOUNCE_SPIKE",
      title: `Bounce spike on ${inbox.email}`,
      body: `${bounceRate}% bounce rate over 7 days (threshold ${threshold}%). The inbox was paused to protect your reputation.`,
      href: "/settings/infrastructure/inboxes",
    });
  }
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
  messageId?: string | null;
}) {
  const receivedAt = input.receivedAt ?? new Date();
  if (input.messageId && (await db.reply.findFirst({ where: { workspaceId: input.workspaceId, messageId: input.messageId } }))) return null;
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
      messageId: input.messageId ?? null,
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
