"use server";

import { db } from "@/lib/db";
import { assertWorkspace } from "@/lib/auth/guard";
import { id } from "@/lib/validation";
import { run, type ActionResult } from "../action";

export async function getListLeadIds(listId: string): Promise<ActionResult<string[]>> {
  return run<string[]>(async () => {
    const ctx = await assertWorkspace("VIEWER");
    const members = await db.leadListMember.findMany({ where: { listId: id.parse(listId), list: { workspaceId: ctx.workspaceId } }, select: { leadId: true } });
    return { ok: true, data: members.map((m) => m.leadId) };
  });
}
