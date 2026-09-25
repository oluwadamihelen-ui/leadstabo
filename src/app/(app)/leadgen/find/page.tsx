import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { leadDatabase } from "@/lib/providers";
import { filtersFromParams } from "@/lib/lead-filters";
import { LeadgenNav } from "@/components/section-nav";
import { maskEmail } from "@/lib/utils";
import { FindLeads, type ProspectRow } from "./find-leads";

export const metadata: Metadata = { title: "Find Leads" };

const PAGE_SIZE = 25;

export default async function FindLeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireWorkspace();
  const params = await searchParams;
  const f = filtersFromParams(params);

  const saved = await db.lead.findMany({
    where: { workspaceId: ctx.workspaceId, externalId: { not: null } },
    select: { externalId: true, id: true, email: true, emailStatus: true },
  });
  const savedMap = new Map(saved.map((s) => [s.externalId!, s]));

  const provider = leadDatabase();
  const { total, results } = await provider.search(
    {
      ...f,
      excludeDepartments: f.deptExclude,
      excludeIds: f.netNew ? saved.map((s) => s.externalId!) : undefined,
    },
    f.page,
    PAGE_SIZE,
  );

  const rows: ProspectRow[] = results.map((p) => {
    const s = savedMap.get(p.externalId);
    return {
      externalId: p.externalId,
      leadId: s?.id ?? null,
      name: `${p.firstName} ${p.lastName}`,
      title: p.title,
      seniority: p.seniority,
      department: p.department,
      company: p.company.name,
      domain: p.company.domain,
      industry: p.company.industry,
      size: p.company.size,
      revenue: p.company.revenue,
      technologies: p.company.technologies,
      location: `${p.city}, ${p.country}`,
      keywords: p.keywords,
      email: s ? s.email : maskEmail(p.email),
      emailStatus: s?.emailStatus ?? null,
      linkedinUrl: p.linkedinUrl,
    };
  });

  const [lists, credits] = await Promise.all([
    db.leadList.findMany({ where: { workspaceId: ctx.workspaceId }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true } }),
    db.creditBalance.findUnique({ where: { workspaceId: ctx.workspaceId } }),
  ]);

  return (
    <>
      <LeadgenNav active="/leadgen/find" />
      <FindLeads
        rows={rows}
        total={total}
        page={f.page}
        pageSize={PAGE_SIZE}
        lists={lists}
        credits={credits?.balance ?? 0}
        totalContacts={provider.totalContacts}
        canEdit={ctx.role !== "VIEWER"}
      />
    </>
  );
}
