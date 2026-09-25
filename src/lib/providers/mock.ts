// Offline mock implementations of every provider contract.
import { createHash, randomUUID } from "crypto";
import type {
  AiProvider,
  DnsProvider,
  EmailProvider,
  PaymentsProvider,
  VerificationProvider,
  VerificationResult,
} from "./types";
import { mockAi } from "./ai-mock";

function hashInt(s: string) {
  return parseInt(createHash("md5").update(s).digest("hex").slice(0, 8), 16);
}

export const mockEmail: EmailProvider = {
  name: "mock",
  live: false,
  async testConnection(creds) {
    if (creds.provider === "SMTP" && (!creds.smtpHost || !creds.password)) {
      return { ok: false, error: "SMTP host and password are required" };
    }
    return { ok: true };
  },
  async send(_creds, msg) {
    // ~2% synthetic bounce rate, deterministic per recipient.
    const bounced = hashInt(msg.to.email) % 50 === 0;
    return { messageId: `<${randomUUID()}@mail.leadstabo.dev>`, accepted: !bounced, bounced };
  },
};

export const mockVerification: VerificationProvider = {
  name: "mock",
  live: false,
  async verify(email) {
    const e = email.toLowerCase();
    let status: VerificationResult["status"];
    let reason: string;
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e)) {
      status = "INVALID";
      reason = "Syntax error";
    } else if (/^(info|admin|support|hello|contact|sales)@/.test(e)) {
      status = "RISKY";
      reason = "Role-based address";
    } else {
      const h = hashInt(e) % 100;
      if (h < 72) [status, reason] = ["VALID", "Mailbox exists"];
      else if (h < 82) [status, reason] = ["CATCH_ALL", "Domain accepts all addresses"];
      else if (h < 90) [status, reason] = ["RISKY", "Low-quality or full mailbox"];
      else if (h < 96) [status, reason] = ["INVALID", "Mailbox does not exist"];
      else [status, reason] = ["UNKNOWN", "Server did not respond"];
    }
    const score = { VALID: 98, CATCH_ALL: 70, RISKY: 45, UNKNOWN: 30, INVALID: 2 }[status];
    return { email, status, score, reason };
  },
};

export const mockDns: DnsProvider = {
  name: "mock",
  live: false,
  async check(domain, records) {
    // Domains containing "broken" fail DMARC so the UI can show the issue state.
    const out: Record<string, "VALID" | "INVALID" | "PENDING"> = {};
    for (const r of records) out[r.kind] = domain.includes("broken") && r.kind === "DMARC" ? "INVALID" : "VALID";
    return out;
  },
};

export const mockPayments: PaymentsProvider = {
  name: "mock",
  live: false,
  async startPlanChange() {
    return { mode: "immediate", providerRef: `sub_mock_${randomUUID().slice(0, 8)}` };
  },
  async startCreditPurchase() {
    return { mode: "immediate", providerRef: `pi_mock_${randomUUID().slice(0, 8)}` };
  },
  async cancel() {},
};

export { mockAi };
export type { AiProvider };
