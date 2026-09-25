import "server-only";
import { db } from "@/lib/db";
import { addDays } from "@/lib/utils";
import { addCredits } from "./credits";
import { notify } from "./notifications";

/** Activates a plan for a workspace (called directly in test mode, or from the Stripe webhook). */
export async function applyPlan(input: {
  workspaceId: string;
  planKey: string;
  interval: "MONTHLY" | "ANNUAL";
  providerRef: string;
  periodStart?: Date;
  periodEnd?: Date;
}) {
  const plan = await db.plan.findUnique({ where: { key: input.planKey } });
  if (!plan) throw new Error(`Unknown plan ${input.planKey}`);
  const start = input.periodStart ?? new Date();
  const end = input.periodEnd ?? addDays(start, input.interval === "ANNUAL" ? 365 : 30);
  const prev = await db.subscription.findUnique({ where: { workspaceId: input.workspaceId }, include: { plan: true } });
  await db.subscription.upsert({
    where: { workspaceId: input.workspaceId },
    create: { workspaceId: input.workspaceId, planId: plan.id, interval: input.interval, status: "ACTIVE", currentPeriodStart: start, currentPeriodEnd: end, providerRef: input.providerRef },
    update: { planId: plan.id, interval: input.interval, status: "ACTIVE", currentPeriodStart: start, currentPeriodEnd: end, providerRef: input.providerRef },
  });
  // Upgrades grant the difference in monthly credits immediately.
  const diff = plan.leadCredits - (prev?.plan.leadCredits ?? 0);
  if (diff > 0 && prev?.planId !== plan.id) await addCredits(input.workspaceId, diff, "PLAN_GRANT", `Upgrade to ${plan.name} — credits`);
  await db.creditBalance.upsert({
    where: { workspaceId: input.workspaceId },
    create: { workspaceId: input.workspaceId, monthlyCredits: plan.leadCredits },
    update: { monthlyCredits: plan.leadCredits },
  });
  return plan;
}

/** Idempotent credit grant keyed by an external payment reference. */
export async function applyCreditPurchase(workspaceId: string, credits: number, externalRef: string) {
  if (await db.creditTransaction.findUnique({ where: { externalRef } })) return false;
  await addCredits(workspaceId, credits, "PURCHASE", `Purchased ${credits.toLocaleString()} credits`, externalRef);
  return true;
}

/** Monthly renewal: refresh the period and grant the plan's monthly credits once per invoice. */
export async function applyRenewal(workspaceId: string, invoiceRef: string, periodStart: Date, periodEnd: Date) {
  const sub = await db.subscription.findUnique({ where: { workspaceId }, include: { plan: true } });
  if (!sub) return;
  await db.subscription.update({ where: { workspaceId }, data: { status: "ACTIVE", currentPeriodStart: periodStart, currentPeriodEnd: periodEnd } });
  if (await db.creditTransaction.findUnique({ where: { externalRef: invoiceRef } })) return;
  await addCredits(workspaceId, sub.plan.leadCredits, "PLAN_GRANT", `${sub.plan.name} plan monthly credits`, invoiceRef);
}

export async function markSubscription(workspaceId: string, status: "ACTIVE" | "PAST_DUE" | "CANCELED") {
  await db.subscription.updateMany({ where: { workspaceId }, data: { status } });
  if (status === "PAST_DUE") {
    await notify(workspaceId, { type: "LOW_CREDITS", title: "Payment failed", body: "We couldn’t charge your card. Update your payment method to keep sending.", href: "/settings/billing" });
  }
}
