import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, ReplyCategory } from "@prisma/client";
import { MessageSquareReply, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { OutreachNav } from "@/components/section-nav";
import { StatusBadge } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, EmptyState, PageHeader } from "@/components/ui/misc";
import { cn, formatDateTime } from "@/lib/utils";
import { ReplyActions } from "./reply-actions";

export const metadata: Metadata = { title: "Replies" };

const TABS: { key: string; label: string; cats?: ReplyCategory[] }[] = [
  { key: "all", label: "All" },
  { key: "positive", label: "Positive", cats: ["POSITIVE"] },
  { key: "interested", label: "Interested", cats: ["INTERESTED"] },
  { key: "meeting", label: "Meeting requested", cats: ["MEETING_REQUEST"] },
  { key: "question", label: "Question", cats: ["QUESTION"] },
  { key: "negative", label: "Negative", cats: ["NEGATIVE"] },
  { key: "ooo", label: "Out of office", cats: ["OUT_OF_OFFICE"] },
];

export default async function RepliesPage({ searchParams }: { searchParams: Promise<{ cat?: string; open?: string }> }) {
  const ctx = await requireWorkspace();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.cat) ?? TABS[0];
  const where: Prisma.ReplyWhereInput = { workspaceId: ctx.workspaceId, ...(tab.cats ? { category: { in: tab.cats } } : {}), ...(sp.open === "1" ? { handled: false } : {}) };
  const [replies, groups] = await Promise.all([
    db.reply.findMany({ where, orderBy: { receivedAt: "desc" }, take: 100, include: { lead: { include: { company: true } }, campaign: { select: { id: true, name: true } } } }),
    db.reply.groupBy({ by: ["category"], where: { workspaceId: ctx.workspaceId }, _count: true }),
  ]);
  const count = (cats?: ReplyCategory[]) => groups.filter((g) => !cats || cats.includes(g.category)).reduce((a, g) => a + g._count, 0);
  const canEdit = ctx.role !== "VIEWER";

  return (
    <>
      <OutreachNav active="/outreach/replies" />
      <PageHeader title="Replies" description="Every response, classified by AI with a suggested next message." />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex overflow-x-auto rounded-lg border bg-muted/50 p-0.5">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`?cat=${t.key}${sp.open === "1" ? "&open=1" : ""}`}
              className={cn("flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium", tab.key === t.key ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {t.label} <span className="text-[11px] text-muted-foreground">{count(t.cats)}</span>
            </Link>
          ))}
        </div>
        <Link href={`?cat=${tab.key}${sp.open === "1" ? "" : "&open=1"}`} className={cn("rounded-md border px-3 py-1.5 text-[13px]", sp.open === "1" ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground")}>
          {sp.open === "1" ? "✓ " : ""}Needs response only
        </Link>
      </div>

      {replies.length === 0 ? (
        <Card>
          <EmptyState icon={MessageSquareReply} title="No replies in this category" description="Replies will show up here the moment prospects respond." />
        </Card>
      ) : (
        <div className="space-y-3">
          {replies.map((r) => (
            <Card key={r.id} className={cn("p-5", r.handled && "opacity-70")}>
              <div className="flex flex-col gap-4 lg:flex-row">
                <div className="flex min-w-0 flex-1 gap-3">
                  <Avatar name={`${r.lead.firstName} ${r.lead.lastName}`} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/leads/${r.leadId}`} className="font-medium hover:text-primary">
                        {r.lead.firstName} {r.lead.lastName}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {r.lead.title} · {r.lead.company?.name}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(r.receivedAt)}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Sparkles className="size-3 text-primary" /> AI
                      </span>
                      <StatusBadge status={r.category} />
                      <span className="text-[11px] text-muted-foreground">{Math.round(r.aiConfidence * 100)}% confidence</span>
                      {r.campaign && (
                        <Link href={`/outreach/campaigns/${r.campaign.id}`}>
                          <Badge tone="info">{r.campaign.name}</Badge>
                        </Link>
                      )}
                      {r.handled && <Badge tone="success">Handled</Badge>}
                    </div>
                    <p className="mt-3 rounded-lg border bg-background p-3 text-[13px] leading-6">{r.body}</p>
                  </div>
                </div>
                <div className="w-full shrink-0 lg:w-[380px]">
                  <p className="label-caps mb-1.5 flex items-center gap-1.5 text-primary">
                    <Sparkles className="size-3" /> Suggested response
                  </p>
                  <p className="whitespace-pre-wrap rounded-lg border border-primary/20 bg-primary/[0.04] p-3 text-xs leading-5 text-foreground/85">{r.suggestedResponse ?? "—"}</p>
                  <ReplyActions id={r.id} conversationId={r.conversationId} suggestion={r.suggestedResponse} category={r.category} handled={r.handled} canEdit={canEdit} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
