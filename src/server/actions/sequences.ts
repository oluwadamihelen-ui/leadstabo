"use server";

import { db } from "@/lib/db";
import { assertWorkspace } from "@/lib/auth/guard";
import { id, requiredText, text } from "@/lib/validation";
import { DEFAULT_STEPS, normalizeSteps, type StepInput } from "@/lib/sequence-steps";
import { run, UserError, type ActionResult } from "../action";

export async function createSequence(input: { name: string; description?: string }): Promise<ActionResult<{ id: string }>> {
  return run<{ id: string }>(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const seq = await db.sequence.create({
      data: {
        workspaceId: ctx.workspaceId,
        name: requiredText("Name", 120).parse(input.name),
        description: text(300).parse(input.description ?? "") || null,
        steps: { create: DEFAULT_STEPS.map((s, i) => ({ ...s, order: i, subject: s.subject, body: s.body })) },
      },
    });
    return { ok: true, data: { id: seq.id }, message: "Sequence created" };
  });
}

export async function saveSequence(sequenceId: string, input: { name: string; description?: string; steps: StepInput[] }) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const seq = await db.sequence.findFirst({ where: { id: id.parse(sequenceId), workspaceId: ctx.workspaceId }, include: { steps: true } });
    if (!seq) throw new UserError("Sequence not found");
    const steps = normalizeSteps(input.steps);
    const keep = new Set(steps.map((s) => s.id).filter((x): x is string => !!x && seq.steps.some((e) => e.id === x)));
    await db.$transaction(async (tx) => {
      await tx.sequence.update({
        where: { id: seq.id },
        data: { name: requiredText("Name", 120).parse(input.name), description: text(300).parse(input.description ?? "") || null },
      });
      await tx.sequenceStep.deleteMany({ where: { sequenceId: seq.id, id: { notIn: Array.from(keep) } } });
      for (const [i, s] of steps.entries()) {
        const data = { order: i, subject: s.subject, body: s.body, delayDays: s.delayDays, enabled: s.enabled };
        if (s.id && keep.has(s.id)) await tx.sequenceStep.update({ where: { id: s.id }, data });
        else await tx.sequenceStep.create({ data: { ...data, sequenceId: seq.id } });
      }
    });
    return { ok: true as const, message: "Sequence saved" };
  });
}

export async function duplicateSequence(sequenceId: string): Promise<ActionResult<{ id: string }>> {
  return run<{ id: string }>(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const seq = await db.sequence.findFirst({ where: { id: id.parse(sequenceId), workspaceId: ctx.workspaceId }, include: { steps: { orderBy: { order: "asc" } } } });
    if (!seq) throw new UserError("Sequence not found");
    const copy = await db.sequence.create({
      data: {
        workspaceId: ctx.workspaceId,
        name: `${seq.name} (copy)`,
        description: seq.description,
        steps: { create: seq.steps.map(({ order, delayDays, subject, body, enabled }) => ({ order, delayDays, subject, body, enabled })) },
      },
    });
    return { ok: true, data: { id: copy.id }, message: "Sequence duplicated" };
  });
}

export async function deleteSequence(sequenceId: string) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const seq = await db.sequence.findFirst({ where: { id: id.parse(sequenceId), workspaceId: ctx.workspaceId }, include: { campaigns: { where: { status: { in: ["ACTIVE", "PREPARING"] } } } } });
    if (!seq) throw new UserError("Sequence not found");
    if (seq.campaigns.length) throw new UserError(`Used by active campaign “${seq.campaigns[0].name}” — pause or complete it first`);
    await db.sequence.delete({ where: { id: seq.id } });
    return { ok: true as const, message: "Sequence deleted" };
  });
}
