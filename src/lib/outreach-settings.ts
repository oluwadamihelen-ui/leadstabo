import { z } from "zod";

export const outreachSettingsSchema = z.object({
  defaultDailyLimit: z.number().int().min(1).max(2000).default(40),
  defaultTimezone: z.string().max(64).default("UTC"),
  sendWindowStart: z.number().int().min(0).max(23).default(8),
  sendWindowEnd: z.number().int().min(1).max(24).default(17),
  skipWeekends: z.boolean().default(true),
  trackOpens: z.boolean().default(true),
  trackClicks: z.boolean().default(false),
  stopOnReply: z.boolean().default(true),
  unsubscribeFooter: z.string().max(500).default("Not the right person? Reply “unsubscribe” and I won’t follow up."),
  bounceThreshold: z.number().min(0.5).max(20).default(3),
});

export type OutreachSettings = z.infer<typeof outreachSettingsSchema>;

export function readOutreachSettings(json: unknown): OutreachSettings {
  const r = outreachSettingsSchema.safeParse(json ?? {});
  return r.success ? r.data : outreachSettingsSchema.parse({});
}
