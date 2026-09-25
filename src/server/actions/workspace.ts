"use server";

import { db } from "@/lib/db";
import { assertWorkspace } from "@/lib/auth/guard";
import { seedDemoWorkspace } from "@/lib/demo/seed-workspace";
import { run } from "../action";

/** Fills an empty workspace with demo data so new users can explore every screen. */
export async function loadSampleData() {
  return run(async () => {
    const ctx = await assertWorkspace("ADMIN");
    const existing = await db.lead.count({ where: { workspaceId: ctx.workspaceId } });
    if (existing > 0) return { ok: false as const, error: "Sample data can only be loaded into an empty workspace" };
    await seedDemoWorkspace(db, ctx.workspaceId, ctx.user.id);
    return { ok: true as const };
  });
}
