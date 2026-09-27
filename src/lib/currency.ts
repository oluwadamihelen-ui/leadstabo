// Billing currencies (client + server safe). Prices are stored in minor units (cents / kobo).
export const CURRENCIES = ["USD", "NGN"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_LABEL: Record<Currency, string> = { USD: "US Dollar ($)", NGN: "Naira (₦)" };

export function isCurrency(v: unknown): v is Currency {
  return v === "USD" || v === "NGN";
}

export interface PricedPlan {
  monthlyPrice: number;
  annualPrice: number;
  monthlyPriceNgn: number;
  annualPriceNgn: number;
}

/** Per-month display price for a plan in a currency and interval. */
export function planMonthlyPrice(p: PricedPlan, currency: Currency, interval: "MONTHLY" | "ANNUAL") {
  if (currency === "NGN") return interval === "ANNUAL" ? p.annualPriceNgn : p.monthlyPriceNgn;
  return interval === "ANNUAL" ? p.annualPrice : p.monthlyPrice;
}

/** Amount charged at checkout (annual plans are paid for 12 months up front). */
export function planChargeAmount(p: PricedPlan, currency: Currency, interval: "MONTHLY" | "ANNUAL") {
  const m = planMonthlyPrice(p, currency, interval);
  return interval === "ANNUAL" ? m * 12 : m;
}

// Priced to clear the same ~$0.03/credit floor as the Growth/Scale plans (a lead reveal — the
// costliest credit action — runs ~$0.03-0.06 via Apollo). The old prices ($0.019 down to
// $0.00999/credit at the top tier) were below that floor at every size: a customer topping up
// with the 100k pack and spending it on lead reveals would have cost us several times what they
// paid. See docs/PRICING-MARGIN-NOTES.md.
export const CREDIT_PACKS = [
  { credits: 1_000, usd: 4_500, ngn: 6_800_000 },
  { credits: 5_000, usd: 17_500, ngn: 26_400_000 },
  { credits: 20_000, usd: 62_000, ngn: 93_600_000 },
  { credits: 100_000, usd: 300_000, ngn: 453_000_000 },
];

export function packPrice(pack: (typeof CREDIT_PACKS)[number], currency: Currency) {
  return currency === "NGN" ? pack.ngn : pack.usd;
}
