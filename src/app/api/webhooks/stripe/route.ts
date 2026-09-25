import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripeClient } from "@/lib/providers/payments-stripe";
import { applyCreditPurchase, applyPlan, applyRenewal, markSubscription } from "@/lib/services/billing";

// Stripe → Leadstabo fulfilment. Configure the endpoint in Stripe with events:
// checkout.session.completed, invoice.paid, invoice.payment_failed,
// customer.subscription.updated, customer.subscription.deleted
export async function POST(req: NextRequest) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: "Stripe is not configured" }, { status: 501 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Period dates moved from the subscription to its items in recent API versions.
  const period = (sub: Stripe.Subscription) => {
    const s = sub as unknown as { current_period_start?: number; current_period_end?: number };
    const item = sub.items?.data?.[0] as unknown as { current_period_start?: number; current_period_end?: number } | undefined;
    const start = s.current_period_start ?? item?.current_period_start;
    const end = s.current_period_end ?? item?.current_period_end;
    return { start: start ? new Date(start * 1000) : undefined, end: end ? new Date(end * 1000) : undefined };
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        const m = s.metadata ?? {};
        if (!m.workspaceId) break;
        if (m.kind === "plan" && typeof s.subscription === "string") {
          const sub = await stripe.subscriptions.retrieve(s.subscription);
          const p = period(sub);
          await applyPlan({ workspaceId: m.workspaceId, planKey: m.planKey, interval: m.interval === "ANNUAL" ? "ANNUAL" : "MONTHLY", providerRef: sub.id, periodStart: p.start, periodEnd: p.end });
        } else if (m.kind === "credits" && s.payment_status === "paid") {
          await applyCreditPurchase(m.workspaceId, Number(m.credits), s.id);
        }
        break;
      }
      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice & { subscription?: string | null; parent?: { subscription_details?: { subscription?: string } } };
        const subId = inv.subscription ?? inv.parent?.subscription_details?.subscription;
        if (inv.billing_reason !== "subscription_cycle" || !subId) break;
        const sub = await stripe.subscriptions.retrieve(subId);
        const ws = sub.metadata?.workspaceId;
        const p = period(sub);
        if (ws && p.start && p.end) await applyRenewal(ws, inv.id ?? `inv_${event.id}`, p.start, p.end);
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice & { subscription?: string | null; parent?: { subscription_details?: { subscription?: string } } };
        const subId = inv.subscription ?? inv.parent?.subscription_details?.subscription;
        if (!subId) break;
        const sub = await stripe.subscriptions.retrieve(subId);
        if (sub.metadata?.workspaceId) await markSubscription(sub.metadata.workspaceId, "PAST_DUE");
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const ws = sub.metadata?.workspaceId;
        if (!ws) break;
        if (event.type === "customer.subscription.deleted" || sub.status === "canceled") await markSubscription(ws, "CANCELED");
        else if (sub.status === "past_due" || sub.status === "unpaid") await markSubscription(ws, "PAST_DUE");
        else if (sub.status === "active" && sub.metadata?.planKey) {
          const p = period(sub);
          await applyPlan({ workspaceId: ws, planKey: sub.metadata.planKey, interval: sub.metadata.interval === "ANNUAL" ? "ANNUAL" : "MONTHLY", providerRef: sub.id, periodStart: p.start, periodEnd: p.end });
          if (sub.cancel_at_period_end) await markSubscription(ws, "CANCELED");
        }
        break;
      }
    }
  } catch (e) {
    console.error("[stripe webhook]", event.type, e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
