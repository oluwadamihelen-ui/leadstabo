import "server-only";
import type { BillingInterval } from "@prisma/client";
import { db } from "@/lib/db";
import { randomToken } from "@/lib/crypto";
import { UserError } from "@/lib/errors";
import { CREDIT_PACKS, packPrice, planChargeAmount, type Currency } from "@/lib/currency";
import { getGateway } from "@/lib/payments";
import { addDays } from "@/lib/utils";
import { addCredits } from "./credits";
import { notify } from "./notifications";

const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const periodDays = (interval: BillingInterval) => (interval === "ANNUAL" ? 365 : 30);

// ── Checkout ─────────────────────────────────────────────────────────────

/**
 * Creates a Payment row with a server-computed amount, then asks the gateway for a hosted
 * checkout URL. The amount the customer pays is re-checked against this row on verification.
 */
export async function startCheckout(input: {
  workspaceId: string;
  user: { id: string; email: string; name: string };
  gateway: string;
  currency: Currency;
  purpose: "PLAN" | "CREDITS";
  planKey?: string;
  interval?: BillingInterval;
  credits?: number;
}) {
  const gateway = getGateway(input.gateway);
  if (!gateway) throw new UserError("That payment method isn’t available");
  if (!gateway.currencies.includes(input.currency)) throw new UserError(`${gateway.label} doesn’t accept ${input.currency} payments`);

  let amountMinor: number;
  let description: string;
  if (input.purpose === "PLAN") {
    const plan = await db.plan.findUnique({ where: { key: input.planKey ?? "" } });
    if (!plan || plan.contactSales) throw new UserError("Plan not available for online checkout");
    const interval = input.interval ?? "MONTHLY";
    amountMinor = planChargeAmount(plan, input.currency, interval);
    description = `Leadabo ${plan.name} — ${interval === "ANNUAL" ? "12 months" : "1 month"}`;
  } else {
    const pack = CREDIT_PACKS.find((p) => p.credits === input.credits);
    if (!pack) throw new UserError("Unknown credit pack");
    amountMinor = packPrice(pack, input.currency);
    description = `${pack.credits.toLocaleString()} Leadabo credits`;
  }
  if (amountMinor <= 0) throw new UserError(`No ${input.currency} price is set for this item`);

  const reference = `ls_${Date.now().toString(36)}_${randomToken(6).replace(/[^a-zA-Z0-9]/g, "")}`;
  await db.payment.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.user.id,
      gateway: gateway.key,
      reference,
      purpose: input.purpose,
      planKey: input.planKey,
      interval: input.purpose === "PLAN" ? (input.interval ?? "MONTHLY") : null,
      credits: input.credits,
      amountMinor,
      currency: input.currency,
    },
  });
  try {
    const { url } = await gateway.initialize({
      reference,
      amountMinor,
      currency: input.currency,
      email: input.user.email,
      name: input.user.name,
      description,
      callbackUrl: `${appUrl()}/api/payments/callback/${gateway.key}`,
      webhookUrl: `${appUrl()}/api/webhooks/${gateway.key}`,
      metadata: { workspaceId: input.workspaceId, reference, purpose: input.purpose },
    });
    return { url, reference };
  } catch (e) {
    await db.payment.update({ where: { reference }, data: { status: "FAILED", failureReason: e instanceof Error ? e.message.slice(0, 300) : "init failed" } });
    throw new UserError(e instanceof Error ? e.message : "Could not start checkout");
  }
}

/**
 * Confirms a payment with its gateway and, exactly once, delivers what was bought.
 * Safe to call from both the browser redirect and the webhook.
 */
export async function fulfillPayment(reference: string): Promise<"success" | "failed" | "pending" | "unknown"> {
  const payment = await db.payment.findUnique({ where: { reference } });
  if (!payment) return "unknown";
  if (payment.status === "SUCCESS") return "success";
  const gateway = getGateway(payment.gateway);
  if (!gateway) return "unknown";

  const v = await gateway.verify(reference);
  if (v.status === "pending") return "pending";
  if (v.status === "failed") {
    await db.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "FAILED", failureReason: v.message ?? "Payment failed" } });
    return "failed";
  }
  // Never trust the redirect alone: the verified amount and currency must match what we charged.
  const amountOk = v.amountMinor === -1 || (v.amountMinor >= payment.amountMinor && v.currency.toUpperCase() === payment.currency);
  if (!amountOk) {
    await db.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "FAILED", failureReason: `Amount mismatch: got ${v.amountMinor} ${v.currency}` } });
    return "failed";
  }
  // Claim the payment atomically so concurrent callback + webhook can't both fulfil it.
  const claimed = await db.payment.updateMany({ where: { id: payment.id, status: { not: "SUCCESS" } }, data: { status: "SUCCESS", paidAt: new Date(), gatewayRef: v.gatewayRef } });
  if (claimed.count === 0) return "success";

  if (payment.purpose === "CREDITS" && payment.credits) {
    await addCredits(payment.workspaceId, payment.credits, "PURCHASE", `Purchased ${payment.credits.toLocaleString()} credits`, payment.reference);
  } else if (payment.purpose === "PLAN" && payment.planKey) {
    await applyPlan({
      workspaceId: payment.workspaceId,
      planKey: payment.planKey,
      interval: payment.interval ?? "MONTHLY",
      currency: payment.currency,
      gateway: payment.gateway,
      providerRef: payment.reference,
    });
  }
  return "success";
}

// ── Subscription state ───────────────────────────────────────────────────

/**
 * Activates or renews a plan. Paying again for the same plan while it's still active extends
 * the period from its current end date; switching plans starts a fresh period today.
 */
export async function applyPlan(input: { workspaceId: string; planKey: string; interval: BillingInterval; currency: string; gateway: string; providerRef: string }) {
  const plan = await db.plan.findUnique({ where: { key: input.planKey } });
  if (!plan) throw new Error(`Unknown plan ${input.planKey}`);
  const now = new Date();
  const prev = await db.subscription.findUnique({ where: { workspaceId: input.workspaceId }, include: { plan: true } });
  const isRenewal = prev && prev.planId === plan.id && prev.interval === input.interval && prev.currentPeriodEnd > now && prev.status !== "TRIALING";
  const start = isRenewal ? prev.currentPeriodStart : now;
  const end = addDays(isRenewal ? prev.currentPeriodEnd : now, periodDays(input.interval));

  await db.subscription.upsert({
    where: { workspaceId: input.workspaceId },
    create: {
      workspaceId: input.workspaceId,
      planId: plan.id,
      interval: input.interval,
      status: "ACTIVE",
      currency: input.currency,
      gateway: input.gateway,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      providerRef: input.providerRef,
      lastCreditGrantAt: now,
    },
    update: {
      planId: plan.id,
      interval: input.interval,
      status: "ACTIVE",
      currency: input.currency,
      gateway: input.gateway,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      providerRef: input.providerRef,
      renewalRemindedAt: null,
      ...(isRenewal ? {} : { lastCreditGrantAt: now }),
    },
  });
  if (!isRenewal) {
    // New or upgraded plan: top up to this plan's monthly allowance right away.
    const diff = plan.leadCredits - (prev && prev.planId !== plan.id ? prev.plan.leadCredits : 0);
    const grant = prev?.planId === plan.id ? plan.leadCredits : Math.max(diff, 0);
    if (grant > 0) await addCredits(input.workspaceId, grant, "PLAN_GRANT", `${plan.name} plan credits`);
  }
  await db.creditBalance.upsert({
    where: { workspaceId: input.workspaceId },
    create: { workspaceId: input.workspaceId, monthlyCredits: plan.leadCredits },
    update: { monthlyCredits: plan.leadCredits },
  });
  await notify(input.workspaceId, {
    type: "TEAM",
    title: isRenewal ? `${plan.name} plan renewed` : `You’re on the ${plan.name} plan`,
    body: `Paid until ${end.toDateString()}.`,
    href: "/settings/billing",
  });
  return plan;
}

/**
 * Daily housekeeping (worker/cron):
 * - grants each active subscription its monthly credits (annual plans included)
 * - reminds owners 5 days before the period ends (gateways don't auto-renew)
 * - marks unpaid subscriptions past due, and cancels them after a 7-day grace period
 */
export async function runBillingCycle() {
  const now = new Date();
  const subs = await db.subscription.findMany({ where: { status: { in: ["ACTIVE", "PAST_DUE", "TRIALING"] } }, include: { plan: true } });
  let granted = 0;
  for (const s of subs) {
    if (s.status === "ACTIVE" && s.currentPeriodEnd > now && (!s.lastCreditGrantAt || s.lastCreditGrantAt < addDays(now, -30))) {
      await addCredits(s.workspaceId, s.plan.leadCredits, "PLAN_GRANT", `${s.plan.name} plan monthly credits`);
      await db.subscription.update({ where: { id: s.id }, data: { lastCreditGrantAt: now } });
      granted++;
    }
    const daysLeft = (s.currentPeriodEnd.getTime() - now.getTime()) / 86400_000;
    if (s.status === "ACTIVE" && daysLeft <= 5 && daysLeft > 0 && !s.renewalRemindedAt) {
      await notify(s.workspaceId, {
        type: "LOW_CREDITS",
        title: `Your ${s.plan.name} plan renews in ${Math.ceil(daysLeft)} day${Math.ceil(daysLeft) === 1 ? "" : "s"}`,
        body: "Renew now to keep campaigns sending without interruption.",
        href: "/settings/billing",
      });
      await db.subscription.update({ where: { id: s.id }, data: { renewalRemindedAt: now } });
    }
    if (daysLeft <= 0 && s.status === "ACTIVE") {
      await db.subscription.update({ where: { id: s.id }, data: { status: "PAST_DUE" } });
      await notify(s.workspaceId, { type: "LOW_CREDITS", title: "Your plan has expired", body: "Renew within 7 days to keep your plan and sending limits.", href: "/settings/billing" });
    }
    if (daysLeft <= -7 && (s.status === "PAST_DUE" || s.status === "TRIALING")) {
      await db.subscription.update({ where: { id: s.id }, data: { status: "CANCELED" } });
      await db.campaign.updateMany({ where: { workspaceId: s.workspaceId, status: "ACTIVE" }, data: { status: "PAUSED" } });
      await notify(s.workspaceId, { type: "LOW_CREDITS", title: "Subscription ended — campaigns paused", body: "Choose a plan to resume sending.", href: "/settings/billing" });
    }
  }
  return { granted };
}
