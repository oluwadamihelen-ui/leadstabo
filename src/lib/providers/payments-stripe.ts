import "server-only";
import Stripe from "stripe";
import { db } from "@/lib/db";
import type { PaymentsProvider } from "./types";

// Stripe Checkout (hosted) for subscriptions and credit packs. Prices come from the Plan
// table via inline price_data, so no products need to be pre-created in the Stripe dashboard.
// Fulfilment happens in /api/webhooks/stripe.
const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export function createStripePayments(secretKey: string): PaymentsProvider {
  const stripe = new Stripe(secretKey);

  async function customerFor(workspaceId: string, email: string) {
    const ws = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    if (ws.stripeCustomerId) return ws.stripeCustomerId;
    const c = await stripe.customers.create({ email, name: ws.name, metadata: { workspaceId } });
    await db.workspace.update({ where: { id: workspaceId }, data: { stripeCustomerId: c.id } });
    return c.id;
  }

  return {
    name: "stripe",
    live: true,
    async startPlanChange({ workspaceId, customerEmail, plan, interval, currentSubscriptionRef }) {
      // Existing Stripe subscription: swap the price in place (prorated) — no second checkout.
      if (currentSubscriptionRef?.startsWith("sub_")) {
        const sub = await stripe.subscriptions.retrieve(currentSubscriptionRef);
        if (sub.status === "active" || sub.status === "trialing") {
          const item = sub.items.data[0];
          const product = await stripe.products.create({ name: `Leadstabo ${plan.name}`, metadata: { planKey: plan.key } });
          const price = await stripe.prices.create({
            product: product.id,
            currency: plan.currency.toLowerCase(),
            unit_amount: interval === "ANNUAL" ? plan.annualPrice * 12 : plan.monthlyPrice,
            recurring: { interval: interval === "ANNUAL" ? "year" : "month" },
          });
          await stripe.subscriptions.update(sub.id, {
            items: [{ id: item.id, price: price.id }],
            proration_behavior: "create_prorations",
            cancel_at_period_end: false,
            metadata: { workspaceId, planKey: plan.key, interval },
          });
          return { mode: "immediate", providerRef: sub.id };
        }
      }
      const customer = await customerFor(workspaceId, customerEmail);
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: plan.currency.toLowerCase(),
              unit_amount: interval === "ANNUAL" ? plan.annualPrice * 12 : plan.monthlyPrice,
              recurring: { interval: interval === "ANNUAL" ? "year" : "month" },
              product_data: { name: `Leadstabo ${plan.name}` },
            },
          },
        ],
        metadata: { workspaceId, kind: "plan", planKey: plan.key, interval },
        subscription_data: { metadata: { workspaceId, planKey: plan.key, interval } },
        success_url: `${appUrl()}/settings/billing?checkout=success`,
        cancel_url: `${appUrl()}/settings/billing?checkout=cancelled`,
      });
      if (!session.url) throw new Error("Stripe did not return a checkout URL");
      return { mode: "redirect", url: session.url };
    },
    async startCreditPurchase({ workspaceId, customerEmail, credits, amountMinor }) {
      const customer = await customerFor(workspaceId, customerEmail);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer,
        line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: amountMinor, product_data: { name: `${credits.toLocaleString()} Leadstabo credits` } } }],
        metadata: { workspaceId, kind: "credits", credits: String(credits) },
        success_url: `${appUrl()}/settings/billing?checkout=success#credits`,
        cancel_url: `${appUrl()}/settings/billing?checkout=cancelled#credits`,
      });
      if (!session.url) throw new Error("Stripe did not return a checkout URL");
      return { mode: "redirect", url: session.url };
    },
    async cancel(subscriptionRef) {
      if (subscriptionRef?.startsWith("sub_")) await stripe.subscriptions.update(subscriptionRef, { cancel_at_period_end: true });
    },
  };
}

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}
