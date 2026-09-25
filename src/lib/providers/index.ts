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
import { createApollo } from "./leads/apollo";
import { createAnthropicAi } from "./ai-anthropic";
import { smtpEmail } from "./email-smtp";
import { createZeroBounce, dnsVerification } from "./verify-real";
import { realDns } from "./dns-real";
import { createStripePayments } from "./payments-stripe";

// Provider registry. Real providers are used whenever they can run:
//   email        SMTP/IMAP with each inbox's own credentials (always real)
//   dns          live DNS lookups (always real)
//   verification ZeroBounce if ZEROBOUNCE_API_KEY, otherwise live DNS/MX checks
//   leads        Apollo.io if APOLLO_API_KEY, otherwise the built-in demo dataset
//   payments     Stripe Checkout if STRIPE_SECRET_KEY, otherwise instant test-mode changes
//   ai           Claude if ANTHROPIC_API_KEY, otherwise templates
// Set <CAPABILITY>_PROVIDER=mock (e.g. EMAIL_PROVIDER=mock) to force the offline mock for local demos.
const forced = (name: string) => process.env[`${name}_PROVIDER`] === "mock";
const key = (name: string) => (process.env[name] ?? "").trim();

export function emailProvider(): EmailProvider {
  return forced("EMAIL") ? mockEmail : smtpEmail;
}

let verification: VerificationProvider | null = null;
export function verificationProvider(): VerificationProvider {
  if (!verification) verification = forced("VERIFICATION") ? mockVerification : key("ZEROBOUNCE_API_KEY") ? createZeroBounce(key("ZEROBOUNCE_API_KEY")) : dnsVerification;
  return verification;
}

let leads: LeadDatabaseProvider | null = null;
export function leadDatabase(): LeadDatabaseProvider {
  if (!leads) leads = !forced("LEADS") && key("APOLLO_API_KEY") ? createApollo(key("APOLLO_API_KEY")) : mockLeadDatabase;
  return leads;
}

export function dnsProvider(): DnsProvider {
  return forced("DNS") ? mockDns : realDns;
}

let payments: PaymentsProvider | null = null;
export function paymentsProvider(): PaymentsProvider {
  if (!payments) payments = !forced("PAYMENTS") && key("STRIPE_SECRET_KEY") ? createStripePayments(key("STRIPE_SECRET_KEY")) : mockPayments;
  return payments;
}

let ai: AiProvider | null = null;
export function aiProvider(): AiProvider {
  if (!ai) ai = !forced("AI") && key("ANTHROPIC_API_KEY") ? createAnthropicAi(key("ANTHROPIC_API_KEY")) : mockAi;
  return ai;
}

/** Summary for the Integrations settings page. */
export function providerStatus() {
  return {
    email: emailProvider(),
    verification: verificationProvider(),
    leads: leadDatabase(),
    dns: dnsProvider(),
    payments: paymentsProvider(),
    ai: aiProvider(),
  };
}
