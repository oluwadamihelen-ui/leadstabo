"use server";

import { z } from "zod";
import { assertWorkspace } from "@/lib/auth/guard";
import { rateLimit } from "@/lib/rate-limit";
import { aiProvider } from "@/lib/providers";
import type { AiContext, AiResult, AiTask } from "@/lib/providers/types";
import { CREDIT_COSTS, spendCredits } from "@/lib/services/credits";
import { run, type ActionResult } from "../action";

const TASKS = ["generate_email", "improve", "shorten", "personalize", "subject_lines", "rewrite_cta", "follow_up", "suggest_response"] as const;

const ctxSchema = z
  .object({
    lead: z
      .object({
        firstName: z.string().max(80),
        lastName: z.string().max(80).optional(),
        title: z.string().max(120).nullish(),
        company: z.string().max(120).nullish(),
        industry: z.string().max(120).nullish(),
        location: z.string().max(120).nullish(),
      })
      .optional(),
    offer: z.object({ name: z.string().max(120), valueProp: z.string().max(1000), cta: z.string().max(300), proof: z.string().max(500).nullish() }).nullish(),
    icp: z.object({ name: z.string().max(120), pains: z.array(z.string().max(300)).max(10) }).nullish(),
    subject: z.string().max(300).optional(),
    body: z.string().max(10_000).optional(),
    reply: z.string().max(10_000).optional(),
    stepNumber: z.number().int().min(1).max(20).optional(),
  })
  .strict();

export async function aiAssist(task: AiTask, ctx: AiContext): Promise<ActionResult<AiResult>> {
  return run(async () => {
    const ws = await assertWorkspace("MEMBER");
    const t = z.enum(TASKS).parse(task);
    const c = ctxSchema.parse(ctx);
    if (!rateLimit(`ai:${ws.user.id}`, 30, 60_000).ok) return { ok: false, error: "You're generating too fast — wait a moment." };
    await spendCredits(ws.workspaceId, CREDIT_COSTS.AI_GENERATION, "AI_GENERATION", `AI: ${t.replace(/_/g, " ")}`);
    const result = await aiProvider().run(t, { ...c, sender: { name: ws.user.name.split(" ")[0], company: ws.workspace.name } });
    return { ok: true, data: result };
  });
}
