"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { assertWorkspace } from "@/lib/auth/guard";
import { id, ids, requiredText, text } from "@/lib/validation";
import { launchCampaign, processDueSends, SENDABLE_STATUSES } from "@/lib/services/campaign-engine";
import { normalizeSteps, stepSchema } from "@/lib/sequence-steps";
import { run, UserError, type ActionResult } from "../action";

const createSchema = z.object({
  name: requiredText("Campaign name", 120),
  description: text(500).optional(),
  listId: z.string().max(64).optional(),
  leadIds: ids.optional(),
  inboxId: id,
  dailyLimit: z.number().int().min(1).max(2000),
  sendWindowStart: z.number().int().min(0).max(23),
  sendWindowEnd: z.number().int().min(1).max(24),
  timezone: z.string().max(64),
  trackOpens: z.boolean(),
  stopOnReply: z.boolean(),
  steps: z.array(stepSchema),
  launch: z.boolean(),
});

export async function createCampaign(input: z.input<typeof createSchema>): Promise<ActionResult<{ id: string }>> {
  return run<{ id: string }>(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const d = createSchema.parse(input);
    if (d.sendWindowEnd <= d.sendWindowStart) throw new UserError("Send window end must be after start");
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: d.timezone });
    } catch {
      throw new UserError("Unknown timezone");
    }
    const steps = normalizeSteps(d.steps);
    const inbox = await db.inbox.findFirst({ where: { id: d.inboxId, workspaceId: ctx.workspaceId } });
    if (!inbox) throw new UserError("Choose a sending inbox");

    let leadIds: string[] = [];
    let listId: string | null = null;
    if (d.listId) {
      const list = await db.leadList.findFirst({ where: { id: d.listId, workspaceId: ctx.workspaceId }, include: { members: { select: { leadId: true } } } });
      if (!list) throw new UserError("List not found");
      listId = list.id;
      leadIds = list.members.map((m) => m.leadId);
    } else if (d.leadIds?.length) {
      leadIds = (await db.lead.findMany({ where: { workspaceId: ctx.workspaceId, id: { in: d.leadIds } }, select: { id: true } })).map((l) => l.id);
    }
    if (!leadIds.length) throw new UserError("Select at least one lead");

    const campaign = await db.$transaction(async (tx) => {
      const seq = await tx.sequence.create({
        data: {
          workspaceId: ctx.workspaceId,
          name: `${d.name} — sequence`,
          steps: { create: steps.map((s, i) => ({ order: i, subject: s.subject, body: s.body, delayDays: s.delayDays, enabled: s.enabled })) },
        },
      });
      return tx.campaign.create({
        data: {
          workspaceId: ctx.workspaceId,
          name: d.name,
          description: d.description || null,
          status: "DRAFT",
          inboxId: inbox.id,
          sequenceId: seq.id,
          leadListId: listId,
          dailyLimit: d.dailyLimit,
          sendWindowStart: d.sendWindowStart,
          sendWindowEnd: d.sendWindowEnd,
          timezone: d.timezone,
          trackOpens: d.trackOpens,
          stopOnReply: d.stopOnReply,
          leads: { create: leadIds.map((leadId) => ({ leadId })) },
        },
      });
    });
    await db.leadActivity.createMany({ data: leadIds.map((leadId) => ({ leadId, type: "campaign", description: `Added to campaign “${d.name}”` })) });

    if (d.launch) {
      const n = await launchCampaign(campaign.id, ctx.workspaceId);
      return { ok: true, data: { id: campaign.id }, message: `Campaign launched to ${n} verified leads` };
    }
    return { ok: true, data: { id: campaign.id }, message: "Campaign saved as draft" };
  });
}

async function own(workspaceId: string, campaignId: string) {
  const c = await db.campaign.findFirst({ where: { id: id.parse(campaignId), workspaceId } });
  if (!c) throw new UserError("Campaign not found");
  return c;
}

export async function setCampaignStatus(campaignId: string, action: "launch" | "pause" | "resume" | "complete") {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const c = await own(ctx.workspaceId, campaignId);
    switch (z.enum(["launch", "pause", "resume", "complete"]).parse(action)) {
      case "launch": {
        if (c.status !== "DRAFT") throw new UserError("Only drafts can be launched");
        const n = await launchCampaign(c.id, ctx.workspaceId);
        return { ok: true as const, message: `Launched to ${n} verified leads` };
      }
      case "pause":
        if (c.status !== "ACTIVE") throw new UserError("Only active campaigns can be paused");
        await db.campaign.update({ where: { id: c.id }, data: { status: "PAUSED" } });
        return { ok: true as const, message: "Campaign paused" };
      case "resume":
        if (c.status !== "PAUSED") throw new UserError("Only paused campaigns can be resumed");
        await db.campaign.update({ where: { id: c.id }, data: { status: "ACTIVE" } });
        return { ok: true as const, message: "Campaign resumed" };
      case "complete":
        await db.campaign.update({ where: { id: c.id }, data: { status: "COMPLETED", completedAt: new Date() } });
        await db.campaignLead.updateMany({ where: { campaignId: c.id, status: { in: ["QUEUED", "IN_SEQUENCE"] } }, data: { status: "COMPLETED", nextSendAt: null } });
        return { ok: true as const, message: "Campaign marked complete" };
    }
  });
}

const settingsSchema = z.object({
  name: requiredText("Name", 120),
  description: text(500),
  inboxId: id,
  dailyLimit: z.number().int().min(1).max(2000),
  sendWindowStart: z.number().int().min(0).max(23),
  sendWindowEnd: z.number().int().min(1).max(24),
  timezone: z.string().max(64),
  trackOpens: z.boolean(),
  stopOnReply: z.boolean(),
});

export async function updateCampaignSettings(campaignId: string, input: z.input<typeof settingsSchema>) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const c = await own(ctx.workspaceId, campaignId);
    const d = settingsSchema.parse(input);
    if (d.sendWindowEnd <= d.sendWindowStart) throw new UserError("Send window end must be after start");
    if (!(await db.inbox.findFirst({ where: { id: d.inboxId, workspaceId: ctx.workspaceId } }))) throw new UserError("Inbox not found");
    await db.campaign.update({ where: { id: c.id }, data: { ...d, description: d.description || null } });
    return { ok: true as const, message: "Settings saved" };
  });
}

export async function deleteCampaign(campaignId: string) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const c = await own(ctx.workspaceId, campaignId);
    await db.campaign.delete({ where: { id: c.id } });
    return { ok: true as const, message: "Campaign deleted" };
  });
}

export async function duplicateCampaign(campaignId: string): Promise<ActionResult<{ id: string }>> {
  return run<{ id: string }>(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const c = await db.campaign.findFirst({
      where: { id: id.parse(campaignId), workspaceId: ctx.workspaceId },
      include: { sequence: { include: { steps: { orderBy: { order: "asc" } } } }, leads: { select: { leadId: true } } },
    });
    if (!c) throw new UserError("Campaign not found");
    const seq = c.sequence
      ? await db.sequence.create({
          data: {
            workspaceId: ctx.workspaceId,
            name: `${c.sequence.name} (copy)`,
            steps: { create: c.sequence.steps.map(({ order, delayDays, subject, body, enabled }) => ({ order, delayDays, subject, body, enabled })) },
          },
        })
      : null;
    const copy = await db.campaign.create({
      data: {
        workspaceId: ctx.workspaceId,
        name: `${c.name} (copy)`,
        description: c.description,
        inboxId: c.inboxId,
        sequenceId: seq?.id,
        leadListId: c.leadListId,
        dailyLimit: c.dailyLimit,
        sendWindowStart: c.sendWindowStart,
        sendWindowEnd: c.sendWindowEnd,
        timezone: c.timezone,
        trackOpens: c.trackOpens,
        stopOnReply: c.stopOnReply,
        leads: { create: c.leads },
      },
    });
    return { ok: true, data: { id: copy.id }, message: "Campaign duplicated as draft" };
  });
}

export async function addLeadsToCampaign(input: { campaignId: string; leadIds: string[] }) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const c = await own(ctx.workspaceId, input.campaignId);
    if (c.status === "COMPLETED") throw new UserError("This campaign is completed");
    const leads = await db.lead.findMany({ where: { workspaceId: ctx.workspaceId, id: { in: ids.parse(input.leadIds) } }, select: { id: true, emailStatus: true } });
    const eligible = leads.filter((l) => SENDABLE_STATUSES.includes(l.emailStatus));
    const skipped = leads.length - eligible.length;
    if (!eligible.length) return { ok: false as const, error: "None of these leads are verified — verify their emails first" };
    const active = c.status === "ACTIVE" || c.status === "PAUSED";
    const res = await db.campaignLead.createMany({
      data: eligible.map((l) => ({ campaignId: c.id, leadId: l.id, status: active ? ("IN_SEQUENCE" as const) : ("QUEUED" as const), nextSendAt: active ? new Date() : null })),
      skipDuplicates: true,
    });
    await db.leadActivity.createMany({ data: eligible.map((l) => ({ leadId: l.id, type: "campaign", description: `Added to campaign “${c.name}”` })) });
    return { ok: true as const, message: `Added ${res.count} to ${c.name}${skipped ? ` · ${skipped} unverified skipped` : ""}` };
  });
}

export async function removeCampaignLeads(campaignId: string, leadIds: string[]) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const c = await own(ctx.workspaceId, campaignId);
    const { count } = await db.campaignLead.deleteMany({ where: { campaignId: c.id, leadId: { in: ids.parse(leadIds) } } });
    return { ok: true as const, message: `Removed ${count} lead${count === 1 ? "" : "s"}` };
  });
}

/** Runs the scheduler for this workspace immediately, ignoring the send window. */
export async function sendDueNow(campaignId: string) {
  return run(async () => {
    const ctx = await assertWorkspace("ADMIN");
    const c = await own(ctx.workspaceId, campaignId);
    if (c.status !== "ACTIVE") throw new UserError("Campaign must be active");
    const { sent } = await processDueSends({ workspaceId: ctx.workspaceId, force: true, limit: 50 });
    return { ok: true as const, message: sent ? `Sent ${sent} due email${sent === 1 ? "" : "s"}` : "Nothing due right now — next steps are scheduled" };
  });
}
