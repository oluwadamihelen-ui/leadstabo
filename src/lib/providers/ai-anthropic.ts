import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AiContext, AiProvider, AiResult, AiTask } from "./types";
import { mockAi } from "./ai-mock";

// Claude-backed copywriter. The key is read server-side only (ANTHROPIC_API_KEY).
const MODEL = "claude-opus-5";

const SYSTEM = `You are an expert B2B cold-email copywriter working inside Leadstabo, an outbound sales platform.
Write concise, specific, human emails (under 120 words), no fluff, no buzzwords, one clear call to action.
Keep personalization variables like {{first_name}} intact when present in the input.
Always answer with a single JSON object and nothing else.`;

const INSTRUCTIONS: Record<AiTask, string> = {
  generate_email: 'Write a first-touch cold email. Return {"subject": string, "body": string}.',
  improve: 'Improve clarity and persuasion of this email without making it longer. Return {"subject": string, "body": string}.',
  shorten: 'Make this email about 40% shorter while keeping the CTA. Return {"body": string}.',
  personalize: 'Rewrite the opening so it references the lead and company specifically. Return {"body": string}.',
  subject_lines: 'Suggest 5 short lowercase-friendly subject lines. Return {"subjects": string[]}.',
  rewrite_cta: 'Rewrite only the call-to-action as one low-friction sentence. Return {"text": string}.',
  follow_up: 'Write a short follow-up email for this sequence step. Return {"subject": string, "body": string}.',
  classify_reply:
    'Classify the prospect reply as one of POSITIVE, NEGATIVE, QUESTION, OUT_OF_OFFICE, INTERESTED, MEETING_REQUEST. Return {"category": string, "confidence": number between 0 and 1}.',
  suggest_response: 'Draft a reply to the prospect that moves toward a meeting. Return {"text": string}.',
};

export function createAnthropicAi(apiKey: string): AiProvider {
  const client = new Anthropic({ apiKey });
  return {
    name: "anthropic",
    live: true,
    async run(task, ctx) {
      try {
        const params = {
          model: MODEL,
          max_tokens: 2000,
          output_config: { effort: "low" },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          system: SYSTEM,
          messages: [
            { role: "user", content: `${INSTRUCTIONS[task]}\n\nContext:\n${JSON.stringify(ctx, null, 2)}` },
          ],
        };
        // `fallbacks: "default"` re-runs a declined request on a fallback model server-side.
        const res = await client.beta.messages.create(params as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming);
        if (res.stop_reason === "refusal") return mockAi.run(task, ctx);
        const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
        const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
        return JSON.parse(json) as AiResult;
      } catch (err) {
        console.error("[ai] anthropic call failed, using mock", err);
        return mockAi.run(task, ctx);
      }
    },
  };
}

export type { AiContext };
