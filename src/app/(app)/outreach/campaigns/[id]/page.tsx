import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck, Clock, Eye, Mail, MessageSquareHeart, MessageSquareReply, Pencil, Send, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { campaignFunnels, dailySeries, rate } from "@/lib/services/analytics";
import { OutreachNav } from "@/components/section-nav";
import { ActivityChart } from "@/components/charts/charts";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cn, formatDate, formatDateTime, formatNumber, timeAgo } from "@/lib/utils";
import { CampaignMenu } from "../campaign-client";
import { CampaignControls, CampaignLeadsTools, CampaignSettingsForm, RemoveLeadButton } from "./campaign-detail-client";

export const metadata: Metadata = { title: "Campaign" };

const TABS = ["overview", "leads", "sequence", "settings"] as const;

export default async function CampaignPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const ctx = await requireWorkspace();
  const { id } = await params;
  const tab = (TABS as readonly string[]).includes((await searchParams).tab ?? "") ? (await searchParams).tab! : "overview";
  const c = await db.campaign.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    include: { inbox: true, leadList: true, sequence: { include: { steps: { orderBy: { order: "asc" } } } }, _count: { select: { leads: true } } },
  });
  if (!c) notFound();
  const canEdit = ctx.role !== "VIEWER";

  const [funnels, series, leadStatus] = await Promise.all([
    campaignFunnels(ctx.workspaceId),
    dailySeries(ctx.workspaceId, 30, c.id),
    db.campaignLead.groupBy({ by: ["status"], where: { campaignId: c.id }, _count: true }),
  ]);
  const f = funnels(c.id);
  const ls = (s: string) => leadStatus.find((x) => x.status === s)?._count ?? 0;

  return (
    <>
      <OutreachNav active="/outreach/campaigns" />
      <Link href="/outreach/campaigns" className="mb-3 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Campaigns
      </Link>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
            <StatusBadge status={c.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {c.description ?? "No description"} · {c.inbox?.email ?? "no inbox"} · {c.launchedAt ? `launched ${formatDate(c.launchedAt)}` : `created ${formatDate(c.createdAt)}`}
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <CampaignControls id={c.id} status={c.status} isAdmin={ctx.role === "OWNER" || ctx.role === "ADMIN"} />
            <CampaignMenu id={c.id} status={c.status} afterDelete="/outreach/campaigns" />
          </div>
        )}
      </div>

      <div className="mb-6 flex gap-1 border-b">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`?tab=${t}`}
            className={cn("relative px-3 pb-2.5 text-[13px] font-medium capitalize text-muted-foreground hover:text-foreground", tab === t && "text-foreground after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary")}
          >
            {t}
            {t === "leads" && <span className="ml-1.5 text-xs text-muted-foreground">{c._count.leads}</span>}
          </Link>
        ))}
      </div>

      {tab === "overview" && <Overview c={c} f={f} series={series} ls={ls} />}
      {tab === "leads" && <LeadsTab campaignId={c.id} workspaceId={ctx.workspaceId} canEdit={canEdit} status={c.status} />}
      {tab === "sequence" && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{c.sequence?.name ?? "No sequence"}</CardTitle>
              <CardDescription>{c.sequence ? `${c.sequence.steps.filter((s) => s.enabled).length} enabled emails` : "Attach a sequence to send emails"}</CardDescription>
            </div>
            {c.sequence && canEdit && (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/outreach/sequences/${c.sequence.id}`}>
                  <Pencil /> Edit in builder
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {c.sequence?.steps.map((s, i) => (
              <div key={s.id} className={cn("rounded-lg border p-4", !s.enabled && "opacity-50")}>
                <div className="mb-2 flex items-center gap-2">
                  <Badge tone="primary">Email {i + 1}</Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" /> Day {s.delayDays}
                  </span>
                  {!s.enabled && <Badge>Disabled</Badge>}
                </div>
                <p className="font-medium">{s.subject}</p>
                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {tab === "settings" && (
        <SettingsTab
          c={{
            id: c.id,
            name: c.name,
            description: c.description ?? "",
            inboxId: c.inboxId ?? "",
            dailyLimit: c.dailyLimit,
            sendWindowStart: c.sendWindowStart,
            sendWindowEnd: c.sendWindowEnd,
            timezone: c.timezone,
            trackOpens: c.trackOpens,
            stopOnReply: c.stopOnReply,
          }}
          workspaceId={ctx.workspaceId}
          canEdit={canEdit}
        />
      )}
    </>
  );
}

async function Overview({
  c,
  f,
  series,
  ls,
}: {
  c: { id: string; sequence: { steps: { id: string; subject: string; delayDays: number; enabled: boolean }[] } | null; _count: { leads: number } };
  f: Awaited<ReturnType<Awaited<ReturnType<typeof campaignFunnels>>>>;
  series: Awaited<ReturnType<typeof dailySeries>>;
  ls: (s: string) => number;
}) {
  const stepRows = await db.$queryRaw<{ stepId: string; type: string; n: bigint }[]>`
    SELECT e."stepId", ev.type::text AS type, COUNT(DISTINCT e.id) AS n
    FROM "Email" e JOIN "EmailEvent" ev ON ev."emailId" = e.id
    WHERE e."campaignId" = ${c.id}
    GROUP BY 1, 2`;
  const sv = (step: string, t: string) => Number(stepRows.find((r) => r.stepId === step && r.type === t)?.n ?? 0);
  const lead = [
    ["Queued", ls("QUEUED")],
    ["In sequence", ls("IN_SEQUENCE")],
    ["Replied", ls("REPLIED")],
    ["Completed", ls("COMPLETED")],
    ["Bounced", ls("BOUNCED")],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Leads" value={c._count.leads} icon={Users} />
        <StatCard label="Sent" value={formatNumber(f.sent)} icon={Send} />
        <StatCard label="Delivered" value={formatNumber(f.delivered)} icon={Mail} hint={`${rate(f.bounced, f.sent)}% bounced`} />
        <StatCard label="Open rate" value={`${rate(f.opened, f.delivered)}%`} icon={Eye} />
        <StatCard label="Reply rate" value={`${rate(f.replied, f.delivered)}%`} icon={MessageSquareReply} />
        <StatCard label="Positive" value={f.positive} icon={MessageSquareHeart} />
        <StatCard label="Meetings" value={f.meetings} icon={CalendarCheck} />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Performance</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ActivityChart data={series as unknown as Record<string, string | number>[]} height={240} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lead status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {lead.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium tabular-nums">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>Step performance</CardTitle>
            <CardDescription>Which emails in the sequence earn replies</CardDescription>
          </div>
        </CardHeader>
        {!c.sequence?.steps.length ? (
          <EmptyState icon={Mail} title="No steps" className="py-8" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Step</TH>
                <TH>Subject</TH>
                <TH className="text-right">Sent</TH>
                <TH className="text-right">Opened</TH>
                <TH className="text-right">Replied</TH>
                <TH className="text-right">Reply rate</TH>
              </tr>
            </THead>
            <TBody>
              {c.sequence.steps.map((s, i) => (
                <TR key={s.id}>
                  <TD className="whitespace-nowrap">
                    Email {i + 1} <span className="text-muted-foreground">· day {s.delayDays}</span>
                  </TD>
                  <TD className="max-w-[320px] truncate">{s.subject}</TD>
                  <TD className="text-right tabular-nums">{sv(s.id, "SENT")}</TD>
                  <TD className="text-right tabular-nums">{sv(s.id, "OPENED")}</TD>
                  <TD className="text-right tabular-nums">{sv(s.id, "REPLIED")}</TD>
                  <TD className="text-right tabular-nums">{rate(sv(s.id, "REPLIED"), sv(s.id, "SENT"))}%</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

async function LeadsTab({ campaignId, workspaceId, canEdit, status }: { campaignId: string; workspaceId: string; canEdit: boolean; status: string }) {
  const [leads, lists] = await Promise.all([
    db.campaignLead.findMany({ where: { campaignId }, include: { lead: { include: { company: true } } }, orderBy: { addedAt: "asc" }, take: 500 }),
    db.leadList.findMany({ where: { workspaceId }, select: { id: true, name: true } }),
  ]);
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>Enrolled leads</CardTitle>
          <CardDescription>Only verified leads receive emails. Replies stop the sequence automatically.</CardDescription>
        </div>
        {canEdit && status !== "COMPLETED" && <CampaignLeadsTools campaignId={campaignId} lists={lists} />}
      </CardHeader>
      {leads.length === 0 ? (
        <EmptyState icon={Users} title="No leads enrolled" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Lead</TH>
              <TH>Company</TH>
              <TH>Email status</TH>
              <TH>Progress</TH>
              <TH>Step</TH>
              <TH>Next send</TH>
              <TH>Last contacted</TH>
              <TH className="w-10" />
            </tr>
          </THead>
          <TBody>
            {leads.map((cl) => (
              <TR key={cl.id}>
                <TD>
                  <Link href={`/leads/${cl.leadId}`} className="font-medium hover:text-primary">
                    {cl.lead.firstName} {cl.lead.lastName}
                  </Link>
                  <p className="font-mono text-[11px] text-muted-foreground">{cl.lead.email}</p>
                </TD>
                <TD>{cl.lead.company?.name ?? "—"}</TD>
                <TD>
                  <StatusBadge status={cl.lead.emailStatus} />
                </TD>
                <TD>
                  <StatusBadge status={cl.status} />
                </TD>
                <TD className="tabular-nums">{cl.currentStep}</TD>
                <TD className="whitespace-nowrap text-muted-foreground">{cl.nextSendAt ? formatDateTime(cl.nextSendAt) : "—"}</TD>
                <TD className="whitespace-nowrap text-muted-foreground">{cl.lead.lastContactedAt ? timeAgo(cl.lead.lastContactedAt) : "Never"}</TD>
                <TD>{canEdit && <RemoveLeadButton campaignId={campaignId} leadId={cl.leadId} />}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}

async function SettingsTab({ c, workspaceId, canEdit }: { c: Parameters<typeof CampaignSettingsForm>[0]["initial"]; workspaceId: string; canEdit: boolean }) {
  const inboxes = await db.inbox.findMany({ where: { workspaceId }, select: { id: true, email: true, status: true } });
  return <CampaignSettingsForm initial={c} inboxes={inboxes} canEdit={canEdit} />;
}
