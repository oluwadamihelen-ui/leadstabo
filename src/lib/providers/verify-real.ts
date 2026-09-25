import "server-only";
import { lookupA, lookupMx } from "./dns-lookup";
import type { VerificationProvider, VerificationResult } from "./types";

const ROLE = /^(info|admin|support|hello|contact|sales|office|team|billing|noreply|no-reply|marketing|hr|jobs|careers)@/i;
const DISPOSABLE = new Set(["mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "yopmail.com", "trashmail.com", "sharklasers.com", "getnada.com", "dispostable.com", "temp-mail.org"]);
const SYNTAX = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

const mxCache = new Map<string, { at: number; mx: boolean }>();

async function hasMx(domain: string) {
  const c = mxCache.get(domain);
  if (c && Date.now() - c.at < 3600_000) return c.mx;
  // RFC 5321: fall back to an A record when no MX exists.
  const mx = (await lookupMx(domain)).length > 0 || (await lookupA(domain)).length > 0;
  mxCache.set(domain, { at: Date.now(), mx });
  return mx;
}

/**
 * Built-in verifier (no API key): syntax, disposable & role checks and a live DNS MX lookup.
 * It cannot confirm that an individual mailbox exists — configure ZEROBOUNCE_API_KEY for that.
 */
export const dnsVerification: VerificationProvider = {
  name: "dns-mx",
  live: true,
  async verify(email) {
    const e = email.trim().toLowerCase();
    const domain = e.split("@")[1] ?? "";
    if (!SYNTAX.test(e)) return { email, status: "INVALID", score: 0, reason: "Syntax error" };
    if (DISPOSABLE.has(domain)) return { email, status: "INVALID", score: 5, reason: "Disposable email domain" };
    if (!(await hasMx(domain))) return { email, status: "INVALID", score: 2, reason: "Domain has no mail server (no MX record)" };
    if (ROLE.test(e)) return { email, status: "RISKY", score: 45, reason: "Role-based address" };
    return { email, status: "VALID", score: 80, reason: "Domain accepts mail (MX found; mailbox not individually checked)" };
  },
};

/** ZeroBounce mailbox-level verification. https://www.zerobounce.net/docs/email-validation-api-quickstart */
export function createZeroBounce(apiKey: string): VerificationProvider {
  return {
    name: "zerobounce",
    live: true,
    async verify(email) {
      const url = `https://api.zerobounce.net/v2/validate?api_key=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(email)}&ip_address=`;
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`ZeroBounce HTTP ${res.status}`);
      const j = (await res.json()) as { status?: string; sub_status?: string; error?: string };
      if (j.error) throw new Error(`ZeroBounce: ${j.error}`);
      const map: Record<string, VerificationResult["status"]> = {
        valid: "VALID",
        invalid: "INVALID",
        "catch-all": "CATCH_ALL",
        unknown: "UNKNOWN",
        spamtrap: "INVALID",
        abuse: "RISKY",
        do_not_mail: "RISKY",
      };
      const status = map[j.status ?? "unknown"] ?? "UNKNOWN";
      const score = { VALID: 98, CATCH_ALL: 70, RISKY: 40, UNKNOWN: 30, INVALID: 2 }[status];
      return { email, status, score, reason: [j.status, j.sub_status].filter(Boolean).join(" · ") || "unknown" };
    },
  };
}
