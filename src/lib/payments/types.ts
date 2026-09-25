import type { Currency } from "@/lib/currency";

export interface InitializeInput {
  reference: string;
  amountMinor: number;
  currency: Currency;
  email: string;
  name: string;
  description: string;
  callbackUrl: string;
  webhookUrl: string;
  metadata: Record<string, string>;
}

export interface VerifyResult {
  status: "success" | "failed" | "pending";
  amountMinor: number;
  currency: string;
  gatewayRef?: string;
  message?: string;
}

/** A hosted-checkout payment gateway. All amounts are minor units (kobo / cents). */
export interface PaymentGateway {
  key: "paystack" | "flutterwave" | "korapay" | "test";
  label: string;
  live: boolean;
  currencies: Currency[];
  initialize(input: InitializeInput): Promise<{ url: string }>;
  verify(reference: string): Promise<VerifyResult>;
  /** Authenticates a webhook and returns the payment reference it concerns. */
  parseWebhook(rawBody: string, headers: Headers): { ok: boolean; reference?: string };
}
