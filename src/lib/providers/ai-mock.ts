// Template-based AI stand-in. Deterministic, lead-aware, and good enough to
// exercise every AI workflow without an API key.
import type { AiContext, AiProvider, AiResult, AiTask } from "./types";

function firstSentence(s: string) {
  return s.split(/(?<=[.!?])\s/)[0] ?? s;
}

function classify(reply: string): { category: string; confidence: number } {
  const r = reply.toLowerCase();
  if (/out of (the )?office|on leave|vacation|annual leave|auto-?reply/.test(r)) return { category: "OUT_OF_OFFICE", confidence: 0.96 };
  if (/(book|schedule|calendar|call|meet).{0,40}(tuesday|wednesday|thursday|friday|monday|next week|tomorrow|time)|send (me )?(a )?(calendar|invite)/.test(r))
    return { category: "MEETING_REQUEST", confidence: 0.9 };
  if (/not interested|unsubscribe|remove me|stop emailing|no thanks|not a fit/.test(r)) return { category: "NEGATIVE", confidence: 0.93 };
  if (/interested|sounds good|tell me more|love to|keen|let'?s chat|open to/.test(r)) return { category: "INTERESTED", confidence: 0.86 };
  if (/\?/.test(r)) return { category: "QUESTION", confidence: 0.74 };
  if (/thanks|great|appreciate/.test(r)) return { category: "POSITIVE", confidence: 0.68 };
  return { category: "UNCLASSIFIED", confidence: 0.4 };
}

function run(task: AiTask, ctx: AiContext): AiResult {
  const first = ctx.lead?.firstName ?? "{{first_name}}";
  const company = ctx.lead?.company ?? "{{company_name}}";
  const title = ctx.lead?.title ?? "your role";
  const industry = ctx.lead?.industry?.toLowerCase() ?? "your space";
  const offer = ctx.offer;
  const pain = ctx.icp?.pains?.[0] ?? `keeping pipeline predictable in ${industry}`;
  const cta = offer?.cta ?? "Worth a quick 15-minute chat next week?";
  const sender = ctx.sender?.name ?? "{{sender_name}}";

  switch (task) {
    case "generate_email":
      return {
        subject: `${first}, quick idea for ${company}`,
        body: `Hi ${first},\n\nMost ${title.toLowerCase()}s I speak with in ${industry} tell me ${pain.charAt(0).toLowerCase() + pain.slice(1).replace(/\.$/, "")}.\n\n${offer ? `${offer.valueProp}${offer.proof ? ` — ${offer.proof}` : ""}.` : `We help teams like ${company} fix that without adding headcount.`}\n\n${cta}\n\nBest,\n${sender}`,
      };
    case "improve": {
      const body = (ctx.body ?? "")
        .replace(/\bI wanted to reach out\b/gi, "Reaching out")
        .replace(/\bjust\b/gi, "")
        .replace(/\bvery\b/gi, "")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
      return { body: body || run("generate_email", ctx).body, subject: ctx.subject };
    }
    case "shorten": {
      const paras = (ctx.body ?? "").split(/\n{2,}/).filter(Boolean);
      const greeting = paras[0]?.startsWith("Hi") ? paras.shift() : `Hi ${first},`;
      const signoff = paras.length > 1 ? paras.pop() : "";
      const core = paras.map(firstSentence).slice(0, 2).join("\n\n");
      return { body: [greeting, core, signoff].filter(Boolean).join("\n\n") };
    }
    case "personalize": {
      const opener = `Hi ${first},\n\nSaw that ${company} is growing its ${industry} footprint${ctx.lead?.location ? ` out of ${ctx.lead.location}` : ""} — congrats.`;
      const rest = (ctx.body ?? "").replace(/^Hi[^\n]*\n+/, "");
      return { body: `${opener}\n\n${rest}` };
    }
    case "subject_lines":
      return {
        subjects: [
          `${first}, quick question`,
          `Idea for ${company}`,
          `${company} + ${offer?.name ?? "Leadstabo"}`,
          `Re: ${industry} pipeline`,
          `Worth 15 minutes, ${first}?`,
        ],
      };
    case "rewrite_cta":
      return {
        text: [
          "Open to a 15-minute call next Tuesday or Wednesday?",
          `Would it be crazy to show you how this works for ${company}?`,
          "Mind if I send over a 2-minute video walkthrough?",
        ][Math.floor(Math.random() * 3)],
      };
    case "follow_up":
      return {
        subject: `Re: ${ctx.subject ?? `${first}, quick idea for ${company}`}`,
        body:
          (ctx.stepNumber ?? 2) >= 4
            ? `Hi ${first},\n\nI'll close the loop here — if ${pain.charAt(0).toLowerCase() + pain.slice(1).replace(/\.$/, "")} becomes a priority, just reply "later" and I'll check back next quarter.\n\nBest,\n${sender}`
            : `Hi ${first},\n\nFloating this back to the top of your inbox. ${offer ? offer.valueProp + "." : ""}\n\nIs this on your radar for this quarter?\n\n${sender}`,
      };
    case "classify_reply":
      return classify(ctx.reply ?? "");
    case "suggest_response": {
      const { category } = classify(ctx.reply ?? "");
      const map: Record<string, string> = {
        MEETING_REQUEST: `Hi ${first},\n\nGreat — here's my calendar so you can grab whatever works best: {{calendar_link}}\n\nLooking forward to it.\n\n${sender}`,
        INTERESTED: `Hi ${first},\n\nGlad this resonated. The quickest way to see if it's a fit is a 15-minute call — does Tuesday or Thursday afternoon work?\n\n${sender}`,
        QUESTION: `Hi ${first},\n\nGood question. In short: ${offer?.valueProp ?? "we handle the heavy lifting end to end"}. Happy to walk you through specifics on a quick call — want me to send a few times?\n\n${sender}`,
        NEGATIVE: `Hi ${first},\n\nUnderstood — thanks for letting me know. I've removed you from this sequence.\n\n${sender}`,
        OUT_OF_OFFICE: `(No reply needed — the sequence will pause and resume after ${first} is back.)`,
      };
      return { text: map[category] ?? `Hi ${first},\n\nThanks for getting back to me. ${cta}\n\n${sender}` };
    }
  }
}

export const mockAi: AiProvider = {
  name: "mock",
  live: false,
  async run(task, ctx) {
    return run(task, ctx);
  },
};
