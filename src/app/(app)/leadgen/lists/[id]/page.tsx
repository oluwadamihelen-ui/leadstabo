import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { LEADS_PAGE_SIZE, listAndCampaignOptions, queryLeads } from "@/lib/queries/leads";
import { LeadgenNav } from "@/components/section-nav";
import { LeadsTable } from "@/components/leads/leads-table";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { ListMenu } from "../list-client";
import { NewLeadButton } from "../../../leads/new-lead";
import { VerifyListButton } from "./verify-list";

export const metadata: Metadata = { title: "Lead List" };

export default async function ListDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireWorkspace();
  const { id } = await params;
  const list = await db.leadList.findFirst({ where: { id, workspaceId: ctx.workspaceId }, include: { campaigns: { select: { id: true, name: true } } } });
  if (!list) notFound();
  const sp = await searchParams;
  const [{ rows, total, page }, opts, counts] = await Promise.all([
    queryLeads(ctx.workspaceId, sp, id),
    listAndCampaignOptions(ctx.workspaceId),
    db.lead.groupBy({ by: ["emailStatus"], where: { workspaceId: ctx.workspaceId, lists: { some: { listId: id } } }, _count: true }),
  ]);
  const c = (s: string[]) => counts.filter((x) => s.includes(x.emailStatus)).reduce((a, x) => a + x._count, 0);
  const all = c(["VALID", "CATCH_ALL", "RISKY", "INVALID", "UNKNOWN", "UNVERIFIED"]);
  const canEdit = ctx.role !== "VIEWER";

  return (
    <>
      <LeadgenNav active="/leadgen/lists" />
      <Link href="/leadgen/lists" className="mb-3 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Lead lists
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{list.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {list.description ?? "No description"} · created {formatDate(list.createdAt)}
            {list.campaigns.length > 0 && (
              <>
                {" · used in "}
                {list.campaigns.map((cp, i) => (
                  <span key={cp.id}>
                    {i > 0 && ", "}
                    <Link className="text-primary hover:underline" href={`/outreach/campaigns/${cp.id}`}>
                      {cp.name}
                    </Link>
                  </span>
                ))}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && <VerifyListButton listId={id} unverified={c(["UNVERIFIED"])} />}
          {canEdit && <NewLeadButton lists={opts.lists} listId={id} />}
          <Button asChild variant="secondary">
            <Link href="/leadgen/find">
              <Search /> Find more
            </Link>
          </Button>
          {canEdit && <ListMenu id={id} name={list.name} onDeleted="/leadgen/lists" />}
        </div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Leads" value={all} />
        <StatCard label="Verified" value={c(["VALID", "CATCH_ALL"])} hint="Valid + catch-all · campaign-eligible" />
        <StatCard label="Unverified" value={c(["UNVERIFIED"])} />
        <StatCard label="Invalid / risky" value={c(["INVALID", "RISKY", "UNKNOWN"])} />
      </div>
      <LeadsTable rows={rows} total={total} page={page} pageSize={LEADS_PAGE_SIZE} lists={opts.lists} campaigns={opts.campaigns} listId={id} canEdit={canEdit} />
    </>
  );
}
