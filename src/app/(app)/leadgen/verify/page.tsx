import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { LEADS_PAGE_SIZE, listAndCampaignOptions, queryLeads } from "@/lib/queries/leads";
import { LeadgenNav } from "@/components/section-nav";
import { LeadsTable } from "@/components/leads/leads-table";
import { StatusBadge } from "@/components/status";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cn, formatDateTime, formatNumber, pct } from "@/lib/utils";
import { ImportCard, VerifyAllButton } from "./verify-client";

export const metadata: Metadata = { title: "Verify Leads" };

const SEGMENTS = [
  { key: "VALID", label: "Valid", color: "bg-success", text: "text-success" },
  { key: "CATCH_ALL", label: "Catch-all", color: "bg-info", text: "text-info" },
  { key: "RISKY", label: "Risky", color: "bg-warning", text: "text-warning" },
  { key: "UNKNOWN", label: "Unknown", color: "bg-muted-foreground/60", text: "text-muted-foreground" },
  { key: "INVALID", label: "Invalid", color: "bg-destructive", text: "text-destructive" },
] as const;

export default async function VerifyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireWorkspace();
  const sp = await searchParams;
  const [groups, runs, { rows, total, page }, opts] = await Promise.all([
    db.lead.groupBy({ by: ["emailStatus"], where: { workspaceId: ctx.workspaceId }, _count: true }),
    db.verificationRun.findMany({ where: { workspaceId: ctx.workspaceId }, orderBy: { createdAt: "desc" }, take: 8 }),
    queryLeads(ctx.workspaceId, sp),
    listAndCampaignOptions(ctx.workspaceId),
  ]);
  const count = (s: string) => groups.find((g) => g.emailStatus === s)?._count ?? 0;
  const totalEmails = groups.reduce((a, g) => a + g._count, 0);
  const verified = totalEmails - count("UNVERIFIED");
  const canEdit = ctx.role !== "VIEWER";

  return (
    <>
      <LeadgenNav active="/leadgen/verify" />
      <PageHeader
        title="Verify Leads"
        description="Only valid and catch-all addresses can enter campaigns — keeping your bounce rate under 2%."
        actions={canEdit && <VerifyAllButton unverified={count("UNVERIFIED")} />}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Verification overview</CardTitle>
              <CardDescription>{formatNumber(totalEmails)} emails in your workspace</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold tabular-nums">{pct(verified, totalEmails, 0)}%</p>
              <p className="text-xs text-muted-foreground">verified</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted" role="img" aria-label="Verification status distribution">
              {SEGMENTS.map((s) => {
                const n = count(s.key);
                return n ? <div key={s.key} className={s.color} style={{ width: `${(n / Math.max(1, totalEmails)) * 100}%` }} title={`${s.label}: ${n}`} /> : null;
              })}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="label-caps">Total</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{formatNumber(totalEmails)}</p>
              </div>
              {SEGMENTS.map((s) => (
                <div key={s.key} className="rounded-lg border bg-muted/30 p-3">
                  <p className="label-caps flex items-center gap-1.5">
                    <span className={cn("size-2 rounded-full", s.color)} /> {s.label}
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">{formatNumber(count(s.key))}</p>
                  <p className="text-[11px] text-muted-foreground">{pct(count(s.key), totalEmails, 0)}%</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {formatNumber(count("UNVERIFIED"))} unverified · Verification costs 1 credit per email. Valid and catch-all emails are campaign-eligible.
            </p>
          </CardContent>
        </Card>
        {canEdit ? (
          <ImportCard />
        ) : (
          <Card>
            <EmptyState icon={ShieldCheck} title="Read-only" description="Viewers can’t import or verify leads." />
          </Card>
        )}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div>
            <CardTitle>Verification history</CardTitle>
            <CardDescription>Recent verification runs</CardDescription>
          </div>
        </CardHeader>
        {runs.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No verification runs yet" className="py-8" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Source</TH>
                <TH>Status</TH>
                <TH className="text-right">Total</TH>
                <TH className="text-right">Valid</TH>
                <TH className="text-right">Catch-all</TH>
                <TH className="text-right">Risky</TH>
                <TH className="text-right">Invalid</TH>
                <TH className="text-right">Unknown</TH>
                <TH>Completed</TH>
              </tr>
            </THead>
            <TBody>
              {runs.map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium">{r.label}</TD>
                  <TD>
                    <StatusBadge status={r.status} />
                  </TD>
                  <TD className="text-right tabular-nums">{r.total}</TD>
                  <TD className="text-right tabular-nums text-success">{r.valid}</TD>
                  <TD className="text-right tabular-nums text-info">{r.catchAll}</TD>
                  <TD className="text-right tabular-nums text-warning">{r.risky}</TD>
                  <TD className="text-right tabular-nums text-destructive">{r.invalid}</TD>
                  <TD className="text-right tabular-nums">{r.unknown}</TD>
                  <TD className="text-muted-foreground">{formatDateTime(r.completedAt ?? r.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <div className="mt-8">
        <h2 className="mb-1 text-lg font-semibold tracking-tight">Leads</h2>
        <p className="mb-4 text-[13px] text-muted-foreground">Filter by status, select leads and click Verify to check specific addresses.</p>
        <LeadsTable rows={rows} total={total} page={page} pageSize={LEADS_PAGE_SIZE} lists={opts.lists} campaigns={opts.campaigns} canEdit={canEdit} />
      </div>
    </>
  );
}
