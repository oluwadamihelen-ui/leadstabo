import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { composerContext } from "@/lib/queries/outreach";
import { CampaignWizard } from "./wizard";

export const metadata: Metadata = { title: "New campaign" };

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ list?: string }> }) {
  const ctx = await requireWorkspace("MEMBER");
  const sp = await searchParams;
  const w = ctx.workspaceId;
  const [lists, leads, inboxes, sequences, comp] = await Promise.all([
    db.leadList.findMany({ where: { workspaceId: w }, orderBy: { name: "asc" }, include: { members: { select: { lead: { select: { id: true, emailStatus: true } } } } } }),
    db.lead.findMany({ where: { workspaceId: w }, include: { company: true }, orderBy: { createdAt: "desc" }, take: 500 }),
    db.inbox.findMany({ where: { workspaceId: w }, include: { domain: true, warmup: true }, orderBy: { email: "asc" } }),
    db.sequence.findMany({ where: { workspaceId: w }, include: { steps: { orderBy: { order: "asc" } } }, orderBy: { updatedAt: "desc" } }),
    composerContext(w, ctx.user.name),
  ]);

  return (
    <CampaignWizard
      initialListId={sp.list}
      lists={lists.map((l) => ({
        id: l.id,
        name: l.name,
        leadIds: l.members.map((m) => m.lead.id),
        total: l.members.length,
        verified: l.members.filter((m) => m.lead.emailStatus === "VALID" || m.lead.emailStatus === "CATCH_ALL").length,
      }))}
      leads={leads.map((l) => ({
        id: l.id,
        firstName: l.firstName,
        lastName: l.lastName,
        email: l.email,
        emailStatus: l.emailStatus,
        title: l.title,
        company: l.company?.name ?? null,
        industry: l.industry,
        location: l.location,
      }))}
      inboxes={inboxes.map((i) => ({
        id: i.id,
        email: i.email,
        domain: i.domain?.domain ?? i.email.split("@")[1],
        status: i.status,
        healthScore: i.healthScore,
        dailyLimit: i.dailyLimit,
        sentToday: i.sentToday,
        warmup: i.warmup?.status ?? "NOT_STARTED",
        signature: i.signature,
      }))}
      sequences={sequences.map((s) => ({ id: s.id, name: s.name, steps: s.steps.map((x) => ({ subject: x.subject, body: x.body, delayDays: x.delayDays, enabled: x.enabled })) }))}
      composer={comp}
      timezone={ctx.user.timezone}
    />
  );
}
