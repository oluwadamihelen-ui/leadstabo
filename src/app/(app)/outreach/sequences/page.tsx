import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Layers, Mail } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { OutreachNav } from "@/components/section-nav";
import { StatusBadge } from "@/components/status";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";
import { NewSequenceButton, SequenceMenu } from "./sequence-client";

export const metadata: Metadata = { title: "Sequences" };

export default async function SequencesPage() {
  const ctx = await requireWorkspace();
  const sequences = await db.sequence.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: { updatedAt: "desc" },
    include: { steps: { orderBy: { order: "asc" } }, campaigns: { select: { id: true, name: true, status: true } } },
  });
  const canEdit = ctx.role !== "VIEWER";
  return (
    <>
      <OutreachNav active="/outreach/sequences" />
      <PageHeader title="Sequences" description="Multi-step email flows. Reuse them across campaigns or build one inside the campaign wizard." actions={canEdit && <NewSequenceButton />} />
      {sequences.length === 0 ? (
        <Card>
          <EmptyState icon={Layers} title="No sequences yet" description="Build your first 3–4 step sequence." action={canEdit && <NewSequenceButton />} />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sequences.map((s) => {
            const enabled = s.steps.filter((x) => x.enabled);
            const days = enabled.reduce((a, x) => Math.max(a, x.delayDays), 0);
            return (
              <Card key={s.id} className="group p-5 transition-colors hover:border-foreground/15">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/outreach/sequences/${s.id}`} className="min-w-0">
                    <p className="truncate text-[15px] font-semibold group-hover:text-primary">{s.name}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{s.description ?? "No description"}</p>
                  </Link>
                  {canEdit && <SequenceMenu id={s.id} />}
                </div>
                <div className="mt-4 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
                  {s.steps.map((st, i) => (
                    <div key={st.id} className="flex items-center gap-1">
                      {i > 0 && <span className="h-px w-4 bg-border" />}
                      <div className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-center ${st.enabled ? "bg-muted/40" : "opacity-40"}`}>
                        <Mail className="mx-auto size-3.5 text-primary" />
                        <p className="mt-0.5 text-[10px] font-medium">Day {st.delayDays}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Mail className="size-3.5" /> {enabled.length} emails
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5" /> {days} days
                    </span>
                    <span>Updated {formatDate(s.updatedAt)}</span>
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {s.campaigns.length === 0 ? (
                      "Not used"
                    ) : (
                      s.campaigns.map((c) => (
                        <Link key={c.id} href={`/outreach/campaigns/${c.id}`} className="flex items-center gap-1 hover:text-foreground">
                          {c.name} <StatusBadge status={c.status} />
                        </Link>
                      ))
                    )}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
