import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { composerContext } from "@/lib/queries/outreach";
import { OutreachNav } from "@/components/section-nav";
import { SequenceEditor } from "./sequence-editor";

export const metadata: Metadata = { title: "Sequence builder" };

export default async function SequencePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireWorkspace();
  const { id } = await params;
  const seq = await db.sequence.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    include: { steps: { orderBy: { order: "asc" } }, campaigns: { select: { id: true, name: true, status: true } } },
  });
  if (!seq) notFound();
  const comp = await composerContext(ctx.workspaceId, ctx.user.name);
  return (
    <>
      <OutreachNav active="/outreach/sequences" />
      <SequenceEditor
        sequence={{
          id: seq.id,
          name: seq.name,
          description: seq.description ?? "",
          steps: seq.steps.map((s) => ({ key: s.id, id: s.id, subject: s.subject, body: s.body, delayDays: s.delayDays, enabled: s.enabled })),
        }}
        campaigns={seq.campaigns}
        composer={comp}
        canEdit={ctx.role !== "VIEWER"}
      />
    </>
  );
}
