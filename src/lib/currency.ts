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

export const CREDIT_PACKS = [
  { credits: 1_000, usd: 1_900, ngn: 2_900_000 },
  { credits: 5_000, usd: 7_900, ngn: 11_900_000 },
  { credits: 20_000, usd: 24_900, ngn: 37_900_000 },
  { credits: 100_000, usd: 99_900, ngn: 149_900_000 },
];

export function packPrice(pack: (typeof CREDIT_PACKS)[number], currency: Currency) {
  return currency === "NGN" ? pack.ngn : pack.usd;
}
