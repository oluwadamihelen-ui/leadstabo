import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { campaignFunnels, dailySeries, inboxFunnels, rate, trend, workspaceFunnel } from "@/lib/services/analytics";
import { ActivityChart, SimpleBarChart } from "@/components/charts/charts";
import { StatCard } from "@/components/stat-card";
import { HealthScore, StatusBadge } from "@/components/status";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cn, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

const RANGES = [7, 30, 90] as const;

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const ctx = await requireWorkspace();
  const w = ctx.workspaceId;
  const sp = await searchParams;
  const days = RANGES.find((r) => String(r) === sp.days) ?? 30;
  const since = new Date(Date.now() - days * 86400_000);

  const [f, series, deltas, campaigns, cf, inboxes, inf, domains, replyCats, topLeads] = await Promise.all([
    workspaceFunnel(w, since),
    dailySeries(w, days),
    trend(w, Math.min(days, 30)),
    db.campaign.findMany({ where: { workspaceId: w }, orderBy: { createdAt: "desc" } }),
    campaignFunnels(w),
    db.inbox.findMany({ where: { workspaceId: w }, include: { domain: true } }),
    inboxFunnels(w),
    db.sendingDomain.findMany({ where: { workspaceId: w }, include: { inboxes: { select: { id: true } } } }),
    db.reply.groupBy({ by: ["category"], where: { workspaceId: w, receivedAt: { gte: since } }, _count: true }),
    db.$queryRaw<{ leadId: string; firstName: string; lastName: string; opens: bigint; replies: bigint }[]>`
      SELECT l.id AS "leadId", l."firstName", l."lastName",
        COUNT(*) FILTER (WHERE ev.type = 'OPENED') AS opens,
        COUNT(*) FILTER (WHERE ev.type = 'REPLIED') AS replies
      FROM "EmailEvent" ev JOIN "Email" e ON e.id = ev."emailId" JOIN "Lead" l ON l.id = e."leadId"
      WHERE ev."workspaceId" = ${w}
      GROUP BY 1, 2, 3 ORDER BY replies DESC, opens DESC LIMIT 8`,
  ]);
  const conversion = rate(f.meetings, f.sent);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Delivery, engagement and conversion across campaigns, inboxes, domains and leads."
        actions={
          <div className="inline-flex rounded-lg border bg-muted/50 p-0.5 text-[13px]">
            {RANGES.map((r) => (
              <Link key={r} href={`?days=${r}`} className={cn("rounded-md px-3 py-1.5 font-medium", days === r ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                {r}d
              </Link>
            ))}
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Sent" value={formatNumber(f.sent)} delta={deltas.sent} />
        <StatCard label="Delivered" value={`${rate(f.delivered, f.sent)}%`} hint={formatNumber(f.delivered)} />
        <StatCard label="Bounced" value={`${rate(f.bounced, f.sent)}%`} hint={formatNumber(f.bounced)} />
        <StatCard label="Opened" value={`${rate(f.opened, f.delivered)}%`} delta={deltas.opened} />
        <StatCard label="Clicked" value={`${rate(f.clicked, f.delivered)}%`} hint={formatNumber(f.clicked)} />
        <StatCard label="Replied" value={`${rate(f.replied, f.delivered)}%`} delta={deltas.replied} />
        <StatCard label="Positive" value={formatNumber(f.positive)} delta={deltas.positive} />
        <StatCard label="Conversion" value={`${conversion}%`} hint={`${f.meetings} meetings`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Email activity</CardTitle>
              <CardDescription>Daily sends, opens and replies — last {days} days</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ActivityChart data={series as unknown as Record<string, string | number>[]} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Reply breakdown</CardTitle>
              <CardDescription>AI classification of replies</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {replyCats.length === 0 && <p className="text-[13px] text-muted-foreground">No replies in this range.</p>}
            {replyCats
              .sort((a, b) => b._count - a._count)
              .map((r) => (
                <div key={r.category} className="flex items-center justify-between gap-3">
                  <StatusBadge status={r.category} />
                  <div className="mx-2 h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(r._count / Math.max(...replyCats.map((x) => x._count))) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-[13px] tabular-nums">{r._count}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>Campaign performance</CardTitle>
            <CardDescription>All time</CardDescription>
          </div>
        </CardHeader>
        <Table>
          <THead>
            <tr>
              <TH>Campaign</TH>
              <TH>Status</TH>
              <TH className="text-right">Sent</TH>
              <TH className="text-right">Delivered</TH>
              <TH className="text-right">Bounce</TH>
              <TH className="text-right">Open</TH>
              <TH className="text-right">Click</TH>
              <TH className="text-right">Reply</TH>
              <TH className="text-right">Positive</TH>
              <TH className="text-right">Meetings</TH>
            </tr>
          </THead>
          <TBody>
            {campaigns.map((c) => {
              const x = cf(c.id);
              return (
                <TR key={c.id}>
                  <TD>
                    <Link href={`/outreach/campaigns/${c.id}`} className="font-medium hover:text-primary">
                      {c.name}
                    </Link>
                  </TD>
                  <TD>
                    <StatusBadge status={c.status} />
                  </TD>
                  <TD className="text-right tabular-nums">{x.sent}</TD>
                  <TD className="text-right tabular-nums">{x.delivered}</TD>
                  <TD className="text-right tabular-nums">{rate(x.bounced, x.sent)}%</TD>
                  <TD className="text-right tabular-nums">{rate(x.opened, x.delivered)}%</TD>
                  <TD className="text-right tabular-nums">{rate(x.clicked, x.delivered)}%</TD>
                  <TD className="text-right tabular-nums">{rate(x.replied, x.delivered)}%</TD>
                  <TD className="text-right tabular-nums">{x.positive}</TD>
                  <TD className="text-right tabular-nums">{x.meetings}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <div>
              <CardTitle>Inbox performance</CardTitle>
              <CardDescription>Volume and engagement per sending inbox</CardDescription>
            </div>
          </CardHeader>
          <Table>
            <THead>
              <tr>
                <TH>Inbox</TH>
                <TH className="text-right">Sent</TH>
                <TH className="text-right">Open</TH>
                <TH className="text-right">Reply</TH>
                <TH className="text-right">Bounce</TH>
                <TH>Health</TH>
              </tr>
            </THead>
            <TBody>
              {inboxes.map((i) => {
                const x = inf(i.id);
                return (
                  <TR key={i.id}>
                    <TD className="max-w-[220px] truncate">{i.email}</TD>
                    <TD className="text-right tabular-nums">{x.sent}</TD>
                    <TD className="text-right tabular-nums">{rate(x.opened, x.delivered)}%</TD>
                    <TD className="text-right tabular-nums">{rate(x.replied, x.delivered)}%</TD>
                    <TD className="text-right tabular-nums">{i.bounceRate.toFixed(1)}%</TD>
                    <TD>
                      <HealthScore score={i.healthScore} />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Domain performance</CardTitle>
                <CardDescription>Emails sent per sending domain</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <SimpleBarChart
                data={domains.map((d) => ({ label: d.domain, sent: d.inboxes.reduce((a, i) => a + inf(i.id).sent, 0) }))}
                dataKey="sent"
                label="Emails sent"
                height={180}
              />
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader>
              <div>
                <CardTitle>Most engaged leads</CardTitle>
                <CardDescription>Ranked by replies, then opens</CardDescription>
              </div>
            </CardHeader>
            <div className="divide-y border-t">
              {topLeads.map((l) => (
                <Link key={l.leadId} href={`/leads/${l.leadId}`} className="flex items-center justify-between px-5 py-2.5 text-[13px] hover:bg-muted/30">
                  <span className="font-medium">
                    {l.firstName} {l.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {Number(l.opens)} opens · {Number(l.replies)} replies
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
