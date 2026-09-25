import { z } from "zod";
import { UserError } from "@/lib/errors";
import { requiredText } from "@/lib/validation";

export const stepSchema = z.object({
  id: z.string().max(64).optional(),
  subject: requiredText("Subject", 300),
  body: requiredText("Email body", 20_000),
  delayDays: z.number().int().min(0).max(365),
  enabled: z.boolean(),
});
export type StepInput = z.input<typeof stepSchema>;

export const DEFAULT_STEPS: StepInput[] = [
  { subject: "{{first_name}}, quick idea for {{company_name}}", body: "Hi {{first_name}},\n\n…\n\nWorth a quick chat?\n\n{{sender_name}}", delayDays: 0, enabled: true },
  { subject: "Re: {{first_name}}, quick idea for {{company_name}}", body: "Hi {{first_name}},\n\nFloating this back to the top of your inbox.\n\n{{sender_name}}", delayDays: 3, enabled: true },
  { subject: "should I close your file?", body: "Hi {{first_name}},\n\nI haven't heard back, so I'll assume the timing isn't right.\n\n{{sender_name}}", delayDays: 7, enabled: true },
];

export function normalizeSteps(steps: StepInput[]) {
  const parsed = z.array(stepSchema).min(1, "Add at least one email").max(12).parse(steps);
  // Delays are cumulative days from the first email and must not decrease.
  for (let i = 1; i < parsed.length; i++) {
    if (parsed[i].delayDays < parsed[i - 1].delayDays) throw new UserError(`Step ${i + 1} must be sent on or after day ${parsed[i - 1].delayDays}`);
  }
  if (parsed[0].delayDays !== 0) parsed[0].delayDays = 0;
  return parsed;
}

