// Heuristic spam-risk scoring for the email composer (client-safe, no deps).

const TRIGGERS = [
  "free", "guarantee", "guaranteed", "act now", "limited time", "click here", "buy now", "100%", "risk-free",
  "urgent", "winner", "cash", "earn money", "no obligation", "special promotion", "double your", "!!!", "$$$",
  "increase sales", "once in a lifetime", "cheap", "discount", "exclusive deal", "congratulations",
];

export interface SpamReport {
  score: number; // 0 (clean) – 100 (very spammy)
  level: "low" | "medium" | "high";
  issues: string[];
  words: number;
  chars: number;
}

export function spamReport(subject: string, body: string): SpamReport {
  const text = `${subject}\n${body}`;
  const lower = text.toLowerCase();
  const issues: string[] = [];
  let score = 0;

  const hits = TRIGGERS.filter((t) => lower.includes(t));
  if (hits.length) {
    score += Math.min(40, hits.length * 10);
    issues.push(`Spam trigger words: ${hits.slice(0, 5).join(", ")}`);
  }
  const links = (body.match(/https?:\/\//g) ?? []).length;
  if (links > 1) {
    score += 15;
    issues.push(`${links} links — keep first-touch emails to 0–1 links`);
  }
  const caps = subject.replace(/[^A-Z]/g, "").length / Math.max(1, subject.replace(/[^A-Za-z]/g, "").length);
  if (subject.length > 6 && caps > 0.5) {
    score += 15;
    issues.push("Subject line is mostly uppercase");
  }
  const bangs = (text.match(/!/g) ?? []).length;
  if (bangs > 2) {
    score += 10;
    issues.push("Too many exclamation marks");
  }
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  if (words > 180) {
    score += 10;
    issues.push(`${words} words — aim for under 125`);
  }
  if (subject.length > 60) {
    score += 5;
    issues.push("Subject over 60 characters may be truncated");
  }
  if (!/\{\{\s*first_name/.test(text)) {
    score += 5;
    issues.push("No {{first_name}} personalization");
  }
  if (/<img|<table/i.test(body)) {
    score += 10;
    issues.push("Heavy HTML (images/tables) hurts deliverability");
  }
  score = Math.min(100, score);
  return { score, level: score < 25 ? "low" : score < 55 ? "medium" : "high", issues, words, chars: text.length };
}
