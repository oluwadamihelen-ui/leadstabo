import "server-only";
import type { EmailStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { LeadRow } from "@/components/leads/leads-table";

const SORTABLE = new Set(["createdAt", "firstName", "title", "emailStatus", "lastContactedAt"]);
const STATUSES = new Set(["VALID", "INVALID", "RISKY", "UNKNOWN", "CATCH_ALL", "UNVERIFIED"]);
export const LEADS_PAGE_SIZE = 25;

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function queryLeads(workspaceId: string, p: Params, listId?: string) {
  const q = one(p.q).trim().slice(0, 100);
  const status = one(p.status);
  const list = listId ?? one(p.list);
  const sort = SORTABLE.has(one(p.sort)) ? one(p.sort) : "createdAt";
  const dir = one(p.dir) === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(one(p.page)) || 1);

  const where: Prisma.LeadWhereInput = { workspaceId };
  if (q) {
    const ci = { contains: q, mode: "insensitive" as const };
    where.OR = [{ firstName: ci }, { lastName: ci }, { email: ci }, { title: ci }, { company: { name: ci } }];
  }
  if (STATUSES.has(status)) where.emailStatus = status as EmailStatus;
  if (list) where.lists = { some: { listId: list } };

  const [total, leads] = await Promise.all([
    db.lead.count({ where }),
    db.lead.findMany({
      where,
      include: { company: true },
      orderBy: [{ [sort]: sort === "title" || sort === "lastContactedAt" ? { sort: dir, nulls: "last" } : dir }, { id: "asc" }],
      skip: (page - 1) * LEADS_PAGE_SIZE,
      take: LEADS_PAGE_SIZE,
    }),
  ]);
  const rows: LeadRow[] = leads.map((l) => ({
    id: l.id,
    name: `${l.firstName} ${l.lastName}`.trim(),
    email: l.email,
    emailStatus: l.emailStatus,
    title: l.title,
    company: l.company?.name ?? null,
    industry: l.industry,
    location: l.location,
    linkedinUrl: l.linkedinUrl,
    size: l.company?.size ?? null,
    lastContactedAt: l.lastContactedAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
  }));
  return { rows, total, page };
}

export async function listAndCampaignOptions(workspaceId: string) {
  const [lists, campaigns] = await Promise.all([
    db.leadList.findMany({ where: { workspaceId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.campaign.findMany({ where: { workspaceId }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, status: true } }),
  ]);
  return { lists, campaigns };
}
