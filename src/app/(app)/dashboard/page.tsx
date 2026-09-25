import Link from "next/link";
import type { Metadata } from "next";
import {
  CalendarCheck,
  ChevronRight,
  Eye,
  Inbox as InboxIcon,
  MailCheck,
  MessageSquareHeart,
  MessageSquareReply,
  Plus,
  Rocket,
  Search,
  Send,
  ShieldCheck,
  Target,
  UserCheck,
  Users,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { campaignFunnels, dailySeries, leadEngagement, rate, trend, workspaceFunnel } from "@/lib/services/analytics";
import { ActivityChart, SimpleBarChart } from "@/components/charts/charts";
import { StatCard } from "@/components/stat-card";
import { HealthScore, StatusBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, EmptyState, Progress } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cn, formatNumber, formatPct, timeAgo } from "@/lib/utils";
import { GettingStarted } from "./getting-started";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = await requireWorkspace();
  const w = ctx.workspaceId;

  const [funnel, series, deltas, leads, verified, activeCampaigns, campaigns, replies, domains, inboxes, contacted, funnels, counts] = await Promise.all([
    workspaceFunnel(w),
    dailySeries(w, 30),
    trend(w, 7),
    db.lead.count({ where: { workspaceId: w } }),
    db.lead.count({ where: { workspaceId: w, emailStatus: { in: ["VALID", "CATCH_ALL"] } } }),
    db.campaign.count({ where: { workspaceId: w, status: "ACTIVE" } }),
    db.campaign.findMany({ where: { workspaceId: w }, orderBy: { updatedAt: "desc" }, take: 5, include: { _count: { select: { leads: true } } } }),
    db.reply.findMany({ where: { workspaceId: w }, orderBy: { receivedAt: "desc" }, take: 6, include: { lead: { include: { company: true } } } }),
    db.sendingDomain.findMany({ where: { workspaceId: w }, orderBy: { createdAt: "asc" }, include: { _count: { select: { inboxes: true } } } }),
    db.inbox.findMany({ where: { workspaceId: w }, select: { status: true, healthScore: true, dailyLimit: true, bounceRate: true } }),
    leadEngagement(w),
    campaignFunnels(w),
    db.icp.count({ where: { workspaceId: w } }),
  ]);

  const firstName = ctx.user.name.split(" ")[0];
  const weekly = Array.from({ length: 4 }, (_, i) => {
    const slice = series.slice(i * 7 + 2, i * 7 + 9);
    return { label: `Week of ${slice[0]?.label ?? ""}`, sent: slice.reduce((a, p) => a + p.sent, 0) };
  });
  const connected = inboxes.filter((i) => i.status === "CONNECTED").length;
  const capacity = inboxes.filter((i) => i.status === "CONNECTED").reduce((a, i) => a + i.dailyLimit, 0);
  const activeDomains = domains.filter((d) => d.status === "ACTIVE");
  const reputation = activeDomains.length ? Math.round(activeDomains.reduce((a, d) => a + d.healthScore, 0) / activeDomains.length) : 0;
  const avgBounce = inboxes.length ? inboxes.reduce((a, i) => a + i.bounceRate, 0) / inboxes.length : 0;
  const isNew = leads === 0 && campaigns.length === 0;

  const pipeline = [
    { label: "Leads", value: leads },
    { label: "Verified", value: verified },
    { label: "Contacted", value: contacted.contacted },
    { label: "Opened", value: contacted.opened },
    { label: "Replied", value: contacted.replied },
    { label: "Positive", value: funnel.positive },
    { label: "Meetings", value: funnel.meetings },
  ];

  return (
    <>
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="label-caps text-primary">Dashboard</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight sm:text-[32px]">Your outbound engine.</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, <span className="text-foreground">{firstName}</span>. Here’s how {ctx.workspace.name} is performing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/outreach/campaigns/new">
              <Plus /> New campaign
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/leadgen/find">
              <Search /> Find leads
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/settings/infrastructure/inboxes">
              <InboxIcon /> Add inbox
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/outreach/inbox">
              <MessageSquareReply /> Inbox
            </Link>
          </Button>
        </div>
      </div>

      {isNew && <GettingStarted hasIcp={counts > 0} hasDomain={domains.length > 0} hasInbox={inboxes.length > 0} />}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Emails sent" value={formatNumber(funnel.sent)} icon={Send} delta={deltas.sent} hint="All time" />
        <StatCard label="Delivered" value={formatNumber(funnel.delivered)} icon={MailCheck} hint={`${formatPct(funnel.bounced, funnel.sent)} bounced`} />
        <StatCard label="Open rate" value={`${rate(funnel.opened, funnel.delivered)}%`} icon={Eye} delta={deltas.opened} />
        <StatCard label="Reply rate" value={`${rate(funnel.replied, funnel.delivered)}%`} icon={MessageSquareReply} delta={deltas.replied} />
        <StatCard label="Positive replies" value={formatNumber(funnel.positive)} icon={MessageSquareHeart} delta={deltas.positive} className="col-span-2 md:col-span-1" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Leads" value={formatNumber(leads)} icon={Users} hint="In your workspace" />
        <StatCard label="Verified leads" value={formatNumber(verified)} icon={UserCheck} hint={`${formatPct(verified, leads, 0)} of leads`} />
        <StatCard label="Meetings booked" value={formatNumber(funnel.meetings)} icon={CalendarCheck} hint={`${formatPct(funnel.meetings, funnel.replied, 0)} of replies`} />
        <StatCard label="Active campaigns" value={activeCampaigns} icon={Rocket} hint={`${campaigns.length} total`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Campaign performance</CardTitle>
              <CardDescription>Sends, opens & replies — last 30 days</CardDescription>
            </div>
            <Link href="/analytics" className="flex items-center text-[13px] text-muted-foreground hover:text-foreground">
              Analytics <ChevronRight className="size-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <ActivityChart data={series as unknown as Record<string, number | string>[]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Lead pipeline</CardTitle>
              <CardDescription>From lead to booked meeting</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pipeline.map((s, i) => {
              const max = Math.max(1, pipeline[0].value);
              return (
                <div key={s.label}>
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-medium tabular-nums">
                      {formatNumber(s.value)}
                      {i > 0 && <span className="ml-1.5 text-xs text-muted-foreground">{formatPct(s.value, pipeline[i - 1].value, 0)}</span>}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (s.value / max) * 100)}%`, opacity: 1 - i * 0.1 }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Recent campaigns</CardTitle>
              <CardDescription>Latest activity across your sequences</CardDescription>
            </div>
            <Link href="/outreach/campaigns" className="flex items-center text-[13px] text-muted-foreground hover:text-foreground">
              View all <ChevronRight className="size-4" />
            </Link>
          </CardHeader>
          {campaigns.length === 0 ? (
            <EmptyState icon={Rocket} title="No campaigns yet" description="Create your first sequence to start landing replies." action={<Button asChild><Link href="/outreach/campaigns/new">Create campaign</Link></Button>} />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Campaign</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Leads</TH>
                  <TH className="text-right">Sent</TH>
                  <TH className="text-right">Open</TH>
                  <TH className="text-right">Reply</TH>
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
                      </TD>
                      <TD>
                        <StatusBadge status={c.status} />
                      </TD>
                      <TD className="text-right tabular-nums">{c._count.leads}</TD>
                      <TD className="text-right tabular-nums">{formatNumber(f.sent)}</TD>
                      <TD className="text-right tabular-nums">{rate(f.opened, f.delivered)}%</TD>
                      <TD className="text-right tabular-nums">{rate(f.replied, f.delivered)}%</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent replies</CardTitle>
              <CardDescription>AI-classified responses</CardDescription>
            </div>
            <Link href="/outreach/replies" className="flex items-center text-[13px] text-muted-foreground hover:text-foreground">
              Open <ChevronRight className="size-4" />
            </Link>
          </CardHeader>
          {replies.length === 0 ? (
            <EmptyState icon={MessageSquareReply} title="No replies yet" description="Replies show up here the moment prospects respond." />
          ) : (
            <div className="divide-y border-t">
              {replies.map((r) => (
                <Link key={r.id} href={`/outreach/inbox?c=${r.conversationId}`} className="flex gap-3 px-5 py-3 transition-colors hover:bg-muted/30">
                  <Avatar name={`${r.lead.firstName} ${r.lead.lastName}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-medium">
                        {r.lead.firstName} {r.lead.lastName}
                        <span className="font-normal text-muted-foreground"> · {r.lead.company?.name}</span>
                      </p>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(r.receivedAt)}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{r.body}</p>
                    <StatusBadge status={r.category} className="mt-1.5" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Infrastructure health</CardTitle>
              <CardDescription>Sending reputation across domains</CardDescription>
            </div>
            <ShieldCheck className="size-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-semibold tabular-nums">{reputation || "—"}</p>
              <p className="pb-1.5 text-sm text-muted-foreground">/ 100 reputation</p>
            </div>
            <Progress value={reputation} tone={reputation >= 85 ? "success" : reputation >= 60 ? "warning" : "danger"} className="mt-3 h-2" />
            <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
              {[
                ["Inboxes", `${connected}/${inboxes.length}`],
                ["Capacity/day", formatNumber(capacity)],
                ["Avg bounce", `${avgBounce.toFixed(1)}%`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border bg-muted/30 px-2 py-2.5">
                  <dt className="text-[11px] text-muted-foreground">{k}</dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Domain status</CardTitle>
              <CardDescription>SPF · DKIM · DMARC</CardDescription>
            </div>
            <Link href="/settings/infrastructure/domains" className="flex items-center text-[13px] text-muted-foreground hover:text-foreground">
              Manage <ChevronRight className="size-4" />
            </Link>
          </CardHeader>
          <div className="divide-y border-t">
            {domains.length === 0 && <EmptyState icon={Target} title="No sending domains" description="Add a secondary domain to protect your main brand." />}
            {domains.slice(0, 5).map((d) => (
              <Link key={d.id} href={`/settings/infrastructure/domains/${d.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-muted/30">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{d.domain}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {d._count.inboxes} inbox{d._count.inboxes === 1 ? "" : "es"} · {d.reputation}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden gap-1 sm:flex">
                    {[d.spfStatus, d.dkimStatus, d.dmarcStatus].map((s, i) => (
                      <span key={i} className={cn("size-1.5 rounded-full", s === "VALID" ? "bg-success" : s === "INVALID" ? "bg-destructive" : "bg-muted-foreground/40")} />
                    ))}
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Weekly email volume</CardTitle>
              <CardDescription>Emails sent per week</CardDescription>
            </div>
            <HealthScore score={reputation} />
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={weekly} dataKey="sent" label="Emails sent" height={190} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
