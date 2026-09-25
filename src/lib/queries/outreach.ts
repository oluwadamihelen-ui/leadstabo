import "server-only";
import { db } from "@/lib/db";
import type { PreviewLead } from "@/components/outreach/email-composer";

/** Data every composer needs: preview leads, offers, ICPs, signature. */
export async function composerContext(workspaceId: string, userName: string, leadIds?: string[]) {
  const [leads, offers, icps, inbox] = await Promise.all([
    db.lead.findMany({
      where: { workspaceId, ...(leadIds ? { id: { in: leadIds } } : {}) },
      include: { company: true },
      orderBy: { createdAt: "asc" },
      take: 25,
    }),
    db.offer.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } }),
    db.icp.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } }),
    db.inbox.findFirst({ where: { workspaceId, signature: { not: null } } }),
  ]);
  const previewLeads: PreviewLead[] = leads.map((l) => ({
    id: l.id,
    firstName: l.firstName,
    lastName: l.lastName,
    title: l.title,
    company: l.company?.name ?? null,
    industry: l.industry,
    location: l.location,
  }));
  return {
    leads: previewLeads,
    offers: offers.map((o) => ({ id: o.id, name: o.name, valueProp: o.valueProp, cta: o.cta, proof: o.proof })),
    icps: icps.map((i) => ({ id: i.id, name: i.name, pains: i.pains })),
    signature: inbox?.signature ?? null,
    senderName: userName.split(" ")[0],
  };
}
