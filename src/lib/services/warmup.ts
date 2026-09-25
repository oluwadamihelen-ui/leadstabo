import "server-only";
import { db } from "@/lib/db";
import { startOfDay } from "@/lib/utils";

/**
 * Advances every active warmup by one day (idempotent per calendar day):
 * ramps volume toward the target and completes warmups that reach it after 21 days.
 * With a real provider this is where warmup emails would be exchanged.
 */
export async function advanceWarmups() {
  const today = startOfDay();
  const due = await db.warmup.findMany({ where: { status: "ACTIVE", updatedAt: { lt: today } } });
  for (const w of due) {
    const currentPerDay = Math.min(w.targetPerDay, w.currentPerDay + w.rampIncrement);
    const daysActive = w.daysActive + 1;
    const complete = daysActive >= 21 && currentPerDay >= w.targetPerDay;
    await db.warmup.update({
      where: { id: w.id },
      data: {
        daysActive,
        currentPerDay,
        replyRate: Math.min(45, Math.max(w.replyRate, 18 + daysActive)),
        healthScore: Math.min(99, 60 + daysActive * 2),
        status: complete ? "COMPLETED" : "ACTIVE",
      },
    });
  }
  return { advanced: due.length };
}
