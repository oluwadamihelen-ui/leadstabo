import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Building2,
  Calendar,
  Globe,

  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Rocket,
  Users,
} from "lucide-react";
import { db } from "@/lib/db";
import { Linkedin } from "@/components/icons";
import { requireWorkspace } from "@/lib/auth/guard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { StatusBadge } from "@/components/status";
import { formatDate, formatDateTime, timeAgo } from "@/lib/utils";
import { LeadActions, NoteForm, NoteItem } from "./lead-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const lead = await db.lead.findUnique({ where: { id }, select: { firstName: true, lastName: true } });
  return { title: lead ? `${lead.firstName} ${lead.lastName}` : "Lead" };
}

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireWorkspace();
  const { id } = await params;
  const lead = await db.lead.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    include: {
      company: true,
      notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 30 },
      campaigns: { include: { campaign: true } },
      lists: { include: { list: true } },
      conversations: { orderBy: { lastMessageAt: "desc" }, include: { replies: { orderBy: { receivedAt: "desc" }, take: 1 } } },
    },
  });
  if (!lead) notFound();
  const campaigns = await db.campaign.findMany({ where: { workspaceId: ctx.workspaceId }, select: { id: true, name: true, status: true } });
  const name = `${lead.firstName} ${lead.lastName}`.trim();
  const canEdit = ctx.role !== "VIEWER";
  const c = lead.company;

  return (
    <>
      <Link href="/leads" className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All leads
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={name} className="size-14 text-base" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
            <p className="text-sm text-muted-foreground">
              {lead.title ?? "—"}
              {c && (
                <>
                  {" "}
                  at <span className="text-foreground">{c.name}</span>
                </>
              )}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={lead.emailStatus} />
              {lead.seniority && <Badge>{lead.seniority}</Badge>}
              {lead.department && <Badge>{lead.department}</Badge>}
              {lead.lists.map((l) => (
                <Link key={l.id} href={`/leadgen/lists/${l.listId}`}>
                  <Badge tone="info">{l.list.name}</Badge>
                </Link>
              ))}
            </div>
          </div>
        </div>
        {canEdit && (
          <LeadActions
            lead={{
              id: lead.id,
              firstName: lead.firstName,
              lastName: lead.lastName,
              email: lead.email,
              title: lead.title ?? "",
              phone: lead.phone ?? "",
              location: lead.location ?? "",
              linkedinUrl: lead.linkedinUrl ?? "",
            }}
            campaigns={campaigns}
          />
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-[13px]">
                <Row icon={Mail} label="Email">
                  <span className="font-mono text-xs">{lead.email}</span>
                </Row>
                <Row icon={Mail} label="Verification">
                  <StatusBadge status={lead.emailStatus} />
                  {lead.verifiedAt && <span className="ml-2 text-xs text-muted-foreground">{timeAgo(lead.verifiedAt)}</span>}
                </Row>
                <Row icon={Phone} label="Phone">
                  {lead.phone ?? "—"}
                </Row>
                <Row icon={MapPin} label="Location">
                  {lead.location ?? "—"}
                </Row>
                <Row icon={Linkedin} label="LinkedIn">
                  {lead.linkedinUrl ? (
                    <a href={lead.linkedinUrl} target="_blank" rel="noreferrer noopener" className="text-info hover:underline">
                      View profile
                    </a>
                  ) : (
                    "—"
                  )}
                </Row>
                <Row icon={Calendar} label="Last contacted">
                  {lead.lastContactedAt ? formatDateTime(lead.lastContactedAt) : "Never"}
                </Row>
                <Row icon={MessageSquare} label="Last reply">
                  {lead.lastRepliedAt ? formatDateTime(lead.lastRepliedAt) : "No reply yet"}
                </Row>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Company</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-[13px]">
                {!c ? (
                  <p className="text-muted-foreground">No company linked.</p>
                ) : (
                  <>
                    <Row icon={Building2} label="Name">
                      {c.name}
                    </Row>
                    <Row icon={Globe} label="Website">
                      {c.website ? (
                        <a href={c.website} target="_blank" rel="noreferrer noopener" className="text-info hover:underline">
                          {c.domain}
                        </a>
                      ) : (
                        c.domain
                      )}
                    </Row>
                    <Row icon={Activity} label="Industry">
                      {c.industry ?? lead.industry ?? "—"}
                    </Row>
                    <Row icon={Users} label="Company size">
                      {c.size ? `${c.size} employees` : "—"}
                    </Row>
                    <Row icon={Activity} label="Revenue">
                      {c.revenue ?? "—"}
                    </Row>
                    <Row icon={MapPin} label="HQ">
                      {c.location ?? "—"}
                    </Row>
                    {c.description && <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">{c.description}</p>}
                    {c.technologies.length > 0 && (
                      <div>
                        <p className="label-caps mb-1.5">Technologies</p>
                        <div className="flex flex-wrap gap-1">
                          {c.technologies.map((t) => (
                            <Badge key={t}>{t}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Campaign membership</CardTitle>
                <CardDescription>Sequences this lead is enrolled in</CardDescription>
              </div>
            </CardHeader>
            {lead.campaigns.length === 0 ? (
              <EmptyState icon={Rocket} title="Not in any campaign" description="Add this lead to a campaign to start outreach." className="py-8" />
            ) : (
              <div className="divide-y border-t">
                {lead.campaigns.map((cl) => (
                  <Link key={cl.id} href={`/outreach/campaigns/${cl.campaignId}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/30">
                    <div>
                      <p className="text-[13px] font-medium">{cl.campaign.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Step {Math.max(1, cl.currentStep)} · added {formatDate(cl.addedAt)}
                        {cl.nextSendAt && ` · next send ${formatDateTime(cl.nextSendAt)}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <StatusBadge status={cl.status} />
                      <StatusBadge status={cl.campaign.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {lead.conversations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Conversations</CardTitle>
              </CardHeader>
              <div className="divide-y border-t">
                {lead.conversations.map((cv) => (
                  <Link key={cv.id} href={`/outreach/inbox?c=${cv.id}`} className="block px-5 py-3 hover:bg-muted/30">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-medium">{cv.subject}</p>
                      <span className="text-xs text-muted-foreground">{timeAgo(cv.lastMessageAt)}</span>
                    </div>
                    {cv.replies[0] && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{cv.replies[0].body}</p>}
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canEdit && <NoteForm leadId={lead.id} />}
              {lead.notes.length === 0 && <p className="text-xs text-muted-foreground">No notes yet.</p>}
              {lead.notes.map((n) => (
                <NoteItem key={n.id} id={n.id} author={n.author.name} body={n.body} at={n.createdAt.toISOString()} canDelete={canEdit} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-4 border-l pl-4">
                {lead.activities.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-card bg-primary" />
                    <p className="text-[13px]">{a.description}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDateTime(a.createdAt)}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}
