import "server-only";
import type {
  AiProvider,
  DnsProvider,
  EmailProvider,
  LeadDatabaseProvider,
  PaymentsProvider,
  VerificationProvider,
} from "./types";
import { mockAi, mockDns, mockEmail, mockPayments, mockVerification } from "./mock";
import { mockLeadDatabase } from "./leads/mock";
import { createAnthropicAi } from "./ai-anthropic";

// Central provider registry. Add a real adapter by implementing the interface in
// ./types.ts and returning it here when its env var selects it.

export function emailProvider(): EmailProvider {
  return mockEmail;
}

export function verificationProvider(): VerificationProvider {
  return mockVerification;
}

export function leadDatabase(): LeadDatabaseProvider {
  return mockLeadDatabase;
}

export function dnsProvider(): DnsProvider {
  return mockDns;
}

export function paymentsProvider(): PaymentsProvider {
  return mockPayments;
}

let ai: AiProvider | null = null;
export function aiProvider(): AiProvider {
  if (!ai) {
    const key = process.env.ANTHROPIC_API_KEY;
    ai = process.env.AI_PROVIDER === "anthropic" && key ? createAnthropicAi(key) : mockAi;
  }
  return ai;
}
