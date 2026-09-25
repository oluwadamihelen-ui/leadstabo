import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { CURRENCIES, isCurrency, type Currency } from "@/lib/currency";
import type { InitializeInput, PaymentGateway, VerifyResult } from "./types";

const eq = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Currencies a gateway accepts, overridable per gateway, e.g. PAYSTACK_CURRENCIES="NGN". */
function currenciesFor(prefix: string, fallback: Currency[]): Currency[] {
  const raw = process.env[`${prefix}_CURRENCIES`];
  if (!raw) return fallback;
  return raw.split(",").map((c) => c.trim().toUpperCase()).filter(isCurrency);
}

async function json<T>(res: Response, label: string): Promise<T> {
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`${label} returned an unexpected response (${res.status})`);
  }
  if (!res.ok) {
    const msg = (body as { message?: string })?.message ?? text.slice(0, 160);
    throw new Error(`${label}: ${msg}`);
  }
  return body as T;
}

// ── Paystack ─────────────────────────────────────────────────────────────
// Docs: https://paystack.com/docs/api/transaction · amounts in kobo/cents.
export function createPaystack(secret: string): PaymentGateway {
  const headers = { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };
  return {
    key: "paystack",
    label: "Paystack",
    live: true,
    currencies: currenciesFor("PAYSTACK", ["NGN", "USD"]),
    async initialize(i: InitializeInput) {
      const r = await json<{ status: boolean; data?: { authorization_url: string } ; message?: string }>(
        await fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers,
          body: JSON.stringify({
            email: i.email,
            amount: i.amountMinor,
            currency: i.currency,
            reference: i.reference,
            callback_url: i.callbackUrl,
            metadata: { ...i.metadata, custom_fields: [{ display_name: "Item", variable_name: "item", value: i.description }] },
          }),
          signal: AbortSignal.timeout(20_000),
        }),
        "Paystack",
      );
      if (!r.status || !r.data?.authorization_url) throw new Error(`Paystack: ${r.message ?? "could not start checkout"}`);
      return { url: r.data.authorization_url };
    },
    async verify(reference) {
      const r = await json<{ status: boolean; data?: { status: string; amount: number; currency: string; id: number; gateway_response?: string } }>(
        await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers, signal: AbortSignal.timeout(20_000) }),
        "Paystack",
      );
      const d = r.data;
      if (!d) return { status: "pending", amountMinor: 0, currency: "" };
      const status: VerifyResult["status"] = d.status === "success" ? "success" : ["failed", "abandoned", "reversed"].includes(d.status) ? "failed" : "pending";
      return { status, amountMinor: d.amount, currency: d.currency, gatewayRef: String(d.id), message: d.gateway_response };
    },
    parseWebhook(raw, h) {
      const sig = h.get("x-paystack-signature") ?? "";
      const expected = createHmac("sha512", secret).update(raw).digest("hex");
      if (!sig || !eq(sig, expected)) return { ok: false };
      const body = JSON.parse(raw) as { event?: string; data?: { reference?: string } };
      return { ok: true, reference: body.data?.reference };
    },
  };
}

// ── Flutterwave (v3) ─────────────────────────────────────────────────────
// Docs: https://developer.flutterwave.com/docs/collecting-payments/standard · amounts in major units.
export function createFlutterwave(secret: string, webhookHash?: string): PaymentGateway {
  const headers = { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };
  return {
    key: "flutterwave",
    label: "Flutterwave",
    live: true,
    currencies: currenciesFor("FLUTTERWAVE", ["NGN", "USD"]),
    async initialize(i) {
      const r = await json<{ status: string; message?: string; data?: { link: string } }>(
        await fetch("https://api.flutterwave.com/v3/payments", {
          method: "POST",
          headers,
          body: JSON.stringify({
            tx_ref: i.reference,
            amount: i.amountMinor / 100,
            currency: i.currency,
            redirect_url: i.callbackUrl,
            customer: { email: i.email, name: i.name },
            customizations: { title: "Leadstabo", description: i.description },
            meta: i.metadata,
          }),
          signal: AbortSignal.timeout(20_000),
        }),
        "Flutterwave",
      );
      if (r.status !== "success" || !r.data?.link) throw new Error(`Flutterwave: ${r.message ?? "could not start checkout"}`);
      return { url: r.data.link };
    },
    async verify(reference) {
      const r = await json<{ status: string; data?: { status: string; amount: number; charged_amount?: number; currency: string; id: number; processor_response?: string } }>(
        await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, { headers, signal: AbortSignal.timeout(20_000) }),
        "Flutterwave",
      );
      const d = r.data;
      if (!d) return { status: "pending", amountMinor: 0, currency: "" };
      const status: VerifyResult["status"] = d.status === "successful" ? "success" : d.status === "failed" ? "failed" : "pending";
      return { status, amountMinor: Math.round(d.amount * 100), currency: d.currency, gatewayRef: String(d.id), message: d.processor_response };
    },
    parseWebhook(raw, h) {
      // Flutterwave sends the "secret hash" you set in the dashboard in the verif-hash header.
      const hash = h.get("verif-hash") ?? "";
      if (!webhookHash || !hash || !eq(hash, webhookHash)) return { ok: false };
      const body = JSON.parse(raw) as { data?: { tx_ref?: string } };
      return { ok: true, reference: body.data?.tx_ref };
    },
  };
}

// ── Korapay ──────────────────────────────────────────────────────────────
// Docs: https://developers.korapay.com/docs/checkout-redirect · amounts in major units.
export function createKorapay(secret: string): PaymentGateway {
  const headers = { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };
  const base = "https://api.korapay.com/merchant/api/v1";
  return {
    key: "korapay",
    label: "Korapay",
    live: true,
    currencies: currenciesFor("KORAPAY", ["NGN"]),
    async initialize(i) {
      const r = await json<{ status: boolean; message?: string; data?: { checkout_url: string } }>(
        await fetch(`${base}/charges/initialize`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            amount: i.amountMinor / 100,
            currency: i.currency,
            reference: i.reference,
            redirect_url: i.callbackUrl,
            notification_url: i.webhookUrl,
            narration: i.description,
            customer: { email: i.email, name: i.name },
            metadata: i.metadata,
          }),
          signal: AbortSignal.timeout(20_000),
        }),
        "Korapay",
      );
      if (!r.status || !r.data?.checkout_url) throw new Error(`Korapay: ${r.message ?? "could not start checkout"}`);
      return { url: r.data.checkout_url };
    },
    async verify(reference) {
      const r = await json<{ status: boolean; data?: { status: string; amount: number | string; currency: string; payment_reference?: string } }>(
        await fetch(`${base}/charges/${encodeURIComponent(reference)}`, { headers, signal: AbortSignal.timeout(20_000) }),
        "Korapay",
      );
      const d = r.data;
      if (!d) return { status: "pending", amountMinor: 0, currency: "" };
      const status: VerifyResult["status"] = d.status === "success" ? "success" : d.status === "failed" ? "failed" : "pending";
      return { status, amountMinor: Math.round(Number(d.amount) * 100), currency: d.currency, gatewayRef: d.payment_reference };
    },
    parseWebhook(raw, h) {
      // Korapay signs JSON.stringify(body.data) with HMAC-SHA256 using the secret key.
      const sig = h.get("x-korapay-signature") ?? "";
      const body = JSON.parse(raw) as { data?: { reference?: string } };
      const expected = createHmac("sha256", secret).update(JSON.stringify(body.data ?? {})).digest("hex");
      if (!sig || !eq(sig, expected)) return { ok: false };
      return { ok: true, reference: body.data?.reference };
    },
  };
}

// ── Test mode ────────────────────────────────────────────────────────────
// Used only when no real gateway is configured: payments succeed instantly without charging anyone.
export const testGateway: PaymentGateway = {
  key: "test",
  label: "Test payment (no charge)",
  live: false,
  currencies: [...CURRENCIES],
  async initialize(i) {
    return { url: `${i.callbackUrl}${i.callbackUrl.includes("?") ? "&" : "?"}reference=${encodeURIComponent(i.reference)}` };
  },
  async verify() {
    return { status: "success", amountMinor: -1, currency: "" }; // amount check skipped for test mode
  },
  parseWebhook() {
    return { ok: false };
  },
};
