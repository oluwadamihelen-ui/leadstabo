import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Plus } from "lucide-react";
import type { CampaignStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { campaignFunnels, rate } from "@/lib/services/analytics";
import { OutreachNav } from "@/components/section-nav";
import { StatusBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { CampaignMenu, CampaignSearch } from "./campaign-client";

export const metadata: Metadata = { title: "Campaigns" };

const TABS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "PAUSED", label: "Paused" },
  { key: "DRAFT", label: "Draft" },
  { key: "PREPARING", label: "Preparing" },
  { key: "COMPLETED", label: "Completed" },
];

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const ctx = await requireWorkspace();
  const sp = await searchParams;
  const status = TABS.some((t) => t.key === sp.status) ? sp.status : "";
  const where: Prisma.CampaignWhereInput = { workspaceId: ctx.workspaceId };
  if (status) where.status = status as CampaignStatus;
  if (sp.q) where.name = { contains: sp.q.slice(0, 80), mode: "insensitive" };
  const [campaigns, counts, funnels] = await Promise.all([
    db.campaign.findMany({ where, orderBy: { createdAt: "desc" }, include: { _count: { select: { leads: true } }, inbox: { select: { email: true } } } }),
    db.campaign.groupBy({ by: ["status"], where: { workspaceId: ctx.workspaceId }, _count: true }),
    campaignFunnels(ctx.workspaceId),
  ]);
  const count = (k: string) => (k ? (counts.find((c) => c.status === k)?._count ?? 0) : counts.reduce((a, c) => a + c._count, 0));
  const canEdit = ctx.role !== "VIEWER";
  const newBtn = canEdit && (
    <Button asChild>
      <Link href="/outreach/campaigns/new">
        <Plus /> New campaign
      </Link>
    </Button>
  );

  return (
    <>
      <OutreachNav active="/outreach/campaigns" />
      <PageHeader title="Campaigns" description="Create, launch and monitor cold email campaigns." actions={newBtn} />
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <CampaignSearch initial={sp.q ?? ""} />
        <div className="flex overflow-x-auto rounded-lg border bg-muted/50 p-0.5">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/outreach/campaigns${t.key ? `?status=${t.key}` : ""}`}
              className={cn("flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium", status === t.key ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {t.label}
              <span className="text-[11px] text-muted-foreground">{count(t.key)}</span>
            </Link>
          ))}
        </div>
      </div>
      <Card className="overflow-hidden">
        {campaigns.length === 0 ? (
          <EmptyState icon={Mail} title={status || sp.q ? "No campaigns match" : "No campaigns yet"} description="Create your first sequence to start landing replies." action={newBtn} />
        ) : (
          <>
            <Table className="hidden md:table">
              <THead>
                <tr>
                  <TH>Campaign</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Leads</TH>
                  <TH className="text-right">Sent</TH>
                  <TH className="text-right">Open rate</TH>
                  <TH className="text-right">Reply rate</TH>
                  <TH className="text-right">Positive</TH>
                  <TH className="text-right">Meetings</TH>
                  <TH>Created</TH>
                  <TH className="w-10" />
                </tr>
              </THead>
              <TBody>
                {campaigns.map((c) => {
                  const f = funnels(c.id);
                  return (
                    <TR key={c.id}>
                      <TD>
                        <Link href={`/outreach/campaigns/${c.id}`} className="font-medium hover:text-primary">
                          {c.name}
                        </Link>
                        <p className="text-[11px] text-muted-foreground">{c.inbox?.email ?? "No inbox"}</p>
                      </TD>
                      <TD>
                        <StatusBadge status={c.status} />
                      </TD>
                      <TD className="text-right tabular-nums">{formatNumber(c._count.leads)}</TD>
                      <TD className="text-right tabular-nums">{formatNumber(f.sent)}</TD>
                      <TD className="text-right tabular-nums">{rate(f.opened, f.delivered)}%</TD>
                      <TD className="text-right tabular-nums">{rate(f.replied, f.delivered)}%</TD>
                      <TD className="text-right tabular-nums text-success">{f.positive}</TD>
                      <TD className="text-right tabular-nums">{f.meetings}</TD>
                      <TD className="whitespace-nowrap text-muted-foreground">{formatDate(c.createdAt)}</TD>
                      <TD>{canEdit && <CampaignMenu id={c.id} status={c.status} />}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            <div className="divide-y md:hidden">
              {campaigns.map((c) => {
                const f = funnels(c.id);
                return (
                  <Link key={c.id} href={`/outreach/campaigns/${c.id}`} className="block p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{c.name}</p>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
                      {[
                        ["Leads", c._count.leads],
                        ["Sent", f.sent],
                        ["Open", `${rate(f.opened, f.delivered)}%`],
                        ["Reply", `${rate(f.replied, f.delivered)}%`],
                      ].map(([k, v]) => (
                        <div key={k as string} className="rounded-md bg-muted/40 py-1.5">
                          <p className="font-semibold">{v}</p>
                          <p className="text-muted-foreground">{k}</p>
                        </div>
                      ))}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </>
  );
}
