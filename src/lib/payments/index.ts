import "server-only";
import type { Currency } from "@/lib/currency";
import { createFlutterwave, createKorapay, createPaystack, testGateway } from "./gateways";
import type { PaymentGateway } from "./types";

const key = (n: string) => (process.env[n] ?? "").trim();

let cached: PaymentGateway[] | null = null;

/** Real gateways whose secret keys are configured, in display order. */
export function liveGateways(): PaymentGateway[] {
  if (!cached) {
    cached = [];
    if (key("PAYSTACK_SECRET_KEY")) cached.push(createPaystack(key("PAYSTACK_SECRET_KEY")));
    if (key("FLUTTERWAVE_SECRET_KEY")) cached.push(createFlutterwave(key("FLUTTERWAVE_SECRET_KEY"), key("FLUTTERWAVE_WEBHOOK_HASH") || undefined));
    if (key("KORAPAY_SECRET_KEY")) cached.push(createKorapay(key("KORAPAY_SECRET_KEY")));
  }
  return cached;
}

/**
 * The free test checkout is only offered when no real gateway is configured, and never in
 * production unless PAYMENTS_TEST_MODE=true — otherwise anyone could grant themselves a plan.
 */
function testAllowed() {
  if (liveGateways().length || process.env.PAYMENTS_PROVIDER === "none") return false;
  return process.env.NODE_ENV !== "production" || process.env.PAYMENTS_TEST_MODE === "true";
}

/** Gateways offered at checkout. */
export function checkoutGateways(currency?: Currency): PaymentGateway[] {
  const all = testAllowed() ? [testGateway] : liveGateways();
  return currency ? all.filter((g) => g.currencies.includes(currency)) : all;
}

export function getGateway(k: string): PaymentGateway | null {
  if (k === "test") return testAllowed() ? testGateway : null;
  return liveGateways().find((g) => g.key === k) ?? null;
}

export type { PaymentGateway } from "./types";
