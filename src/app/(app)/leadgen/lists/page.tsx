import type { Metadata } from "next";
import Link from "next/link";
import { ListChecks } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { LeadgenNav } from "@/components/section-nav";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, Progress } from "@/components/ui/misc";
import { formatDate, formatNumber, pct } from "@/lib/utils";
import { ListMenu, NewListButton } from "./list-client";

export const metadata: Metadata = { title: "Lead Lists" };

export default async function ListsPage() {
  const ctx = await requireWorkspace();
  const lists = await db.leadList.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true } }, campaigns: { select: { id: true, name: true } } },
  });
  const verifiedCounts = await db.leadListMember.groupBy({
    by: ["listId"],
    where: { list: { workspaceId: ctx.workspaceId }, lead: { emailStatus: { in: ["VALID", "CATCH_ALL"] } } },
    _count: true,
  });
  const unverifiedCounts = await db.leadListMember.groupBy({
    by: ["listId"],
    where: { list: { workspaceId: ctx.workspaceId }, lead: { emailStatus: "UNVERIFIED" } },
    _count: true,
  });
  const v = new Map(verifiedCounts.map((x) => [x.listId, x._count]));
  const u = new Map(unverifiedCounts.map((x) => [x.listId, x._count]));
  const canEdit = ctx.role !== "VIEWER";

  return (
    <>
      <LeadgenNav active="/leadgen/lists" />
      <PageHeader title="Lead Lists" description="Organize leads by segment so every campaign speaks to one audience." actions={canEdit && <NewListButton />} />
      {lists.length === 0 ? (
        <Card>
          <EmptyState icon={ListChecks} title="No lists yet" description="Create a list, then add leads from Find Leads or import a CSV." action={canEdit && <NewListButton />} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lists.map((l) => {
            const total = l._count.members;
            const verified = v.get(l.id) ?? 0;
            const unverified = u.get(l.id) ?? 0;
            return (
              <Card key={l.id} className="group flex flex-col p-5 transition-colors hover:border-foreground/15">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/leadgen/lists/${l.id}`} className="min-w-0">
                    <p className="truncate text-[15px] font-semibold group-hover:text-primary">{l.name}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{l.description ?? "No description"}</p>
                  </Link>
                  {canEdit && <ListMenu id={l.id} name={l.name} />}
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  {[
                    ["Leads", total],
                    ["Verified", verified],
                    ["Unverified", unverified],
                  ].map(([k, n]) => (
                    <div key={k} className="rounded-lg border bg-muted/30 py-2">
                      <p className="text-lg font-semibold tabular-nums">{formatNumber(n as number)}</p>
                      <p className="text-[11px] text-muted-foreground">{k}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>Verified</span>
                    <span>{pct(verified, total, 0)}%</span>
                  </div>
                  <Progress value={pct(verified, total)} tone="success" />
                </div>
                <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                  <span>
                    {l.campaigns.length ? `Used in ${l.campaigns.length} campaign${l.campaigns.length > 1 ? "s" : ""}` : "Not used in campaigns"}
                  </span>
                  <span>Created {formatDate(l.createdAt)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
