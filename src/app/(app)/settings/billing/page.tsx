import type { Metadata } from "next";
import { Coins, CreditCard, Send } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { hasRole } from "@/lib/auth/permissions";
import { CREDIT_PACKS } from "@/lib/services/credits";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cn, formatDate, formatDateTime, formatNumber, pct, titleCase } from "@/lib/utils";
import { BuyCredits, CancelPlan, PlanPicker } from "./billing-client";

export const metadata: Metadata = { title: "Billing & Plans" };

const USAGE_CATS = ["LEAD_DISCOVERY", "EMAIL_VERIFICATION", "AI_GENERATION", "EMAIL_SENDING"] as const;

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const ctx = await requireWorkspace();
  const sp = await searchParams;
  const [plans, sub, credits, txns, sums] = await Promise.all([
    db.plan.findMany({ orderBy: { sortOrder: "asc" } }),
    db.subscription.findUnique({ where: { workspaceId: ctx.workspaceId }, include: { plan: true } }),
    db.creditBalance.findUnique({ where: { workspaceId: ctx.workspaceId } }),
    db.creditTransaction.findMany({
      where: { workspaceId: ctx.workspaceId, ...(sp.cat && USAGE_CATS.includes(sp.cat as (typeof USAGE_CATS)[number]) ? { category: sp.cat as (typeof USAGE_CATS)[number] } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.creditTransaction.groupBy({ by: ["category"], where: { workspaceId: ctx.workspaceId }, _sum: { amount: true } }),
  ]);
  const sent = await db.email.count({ where: { workspaceId: ctx.workspaceId, campaignId: { not: null }, sentAt: { gte: sub?.currentPeriodStart ?? new Date(0) } } });
  const plan = sub?.plan;
  const sendPct = plan ? pct(sent, plan.monthlySends) : 0;
  const sum = (c: string) => sums.find((s) => s.category === c)?._sum.amount ?? 0;
  const used = -USAGE_CATS.reduce((a, c) => a + sum(c), 0);
  const purchased = sum("PURCHASE");
  const isOwner = ctx.role === "OWNER";

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="relative overflow-hidden">
          <div className="absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-3xl" />
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-4 text-primary" /> Current plan
              </CardTitle>
              <CardDescription>
                {plan ? `${sub!.interval === "ANNUAL" ? "Billed annually" : "Billed monthly"} · renews ${formatDate(sub!.currentPeriodEnd)}` : "No active plan"}
              </CardDescription>
            </div>
            {sub && <Badge tone={sub.status === "ACTIVE" ? "success" : sub.status === "CANCELED" ? "danger" : "info"}>{titleCase(sub.status)}</Badge>}
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{plan?.name ?? "—"}</p>
            <p className="text-sm text-muted-foreground">{plan?.tagline}</p>
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Send className="size-3.5" /> Monthly sends
                </span>
                <span className="font-medium tabular-nums">
                  {formatNumber(sent)} / {formatNumber(plan?.monthlySends ?? 0)}
                </span>
              </div>
              <Progress value={sendPct} tone={sendPct > 90 ? "danger" : sendPct > 70 ? "warning" : "primary"} className="h-2" />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {formatNumber(Math.max(0, (plan?.monthlySends ?? 0) - sent))} sends remaining · period {sub ? `${formatDate(sub.currentPeriodStart)} – ${formatDate(sub.currentPeriodEnd)}` : "—"}
              </p>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
              {[
                ["Inboxes", plan?.inboxLimit],
                ["Seats", plan?.teamMembers],
                ["Credits/mo", plan?.leadCredits],
              ].map(([k, v]) => (
                <div key={k as string} className="rounded-lg border bg-muted/30 py-2">
                  <dd className="text-sm font-semibold tabular-nums">{formatNumber((v as number) ?? 0)}</dd>
                  <dt className="text-muted-foreground">{k}</dt>
                </div>
              ))}
            </dl>
            {isOwner && sub?.status !== "CANCELED" && (
              <div className="mt-4 flex justify-end">
                <CancelPlan />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Coins className="size-4 text-primary" /> Credits
              </CardTitle>
              <CardDescription>Used for lead reveals (1), verification (1) and AI generation (2).</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{formatNumber(credits?.balance ?? 0)}</p>
            <p className="text-sm text-muted-foreground">current balance</p>
            <dl className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
              {[
                ["Used", used],
                ["Purchased", purchased],
                ["Monthly grant", credits?.monthlyCredits ?? 0],
              ].map(([k, v]) => (
                <div key={k as string} className="rounded-lg border bg-muted/30 py-2">
                  <dd className="text-sm font-semibold tabular-nums">{formatNumber(v as number)}</dd>
                  <dt className="text-muted-foreground">{k}</dt>
                </div>
              ))}
            </dl>
            <div className="mt-4 space-y-2">
              {USAGE_CATS.map((c) => (
                <div key={c} className="flex items-center gap-3 text-xs">
                  <span className="w-32 text-muted-foreground">{titleCase(c)}</span>
                  <Progress value={used ? (Math.abs(sum(c)) / used) * 100 : 0} className="flex-1" />
                  <span className="w-14 text-right tabular-nums">{formatNumber(Math.abs(sum(c)))}</span>
                </div>
              ))}
            </div>
            {hasRole(ctx.role, "ADMIN") && <BuyCredits packs={CREDIT_PACKS} />}
          </CardContent>
        </Card>
      </div>

      <PlanPicker
        plans={plans.map((p) => ({ ...p }))}
        currentKey={plan?.key ?? null}
        currentInterval={sub?.interval ?? "MONTHLY"}
        canChange={isOwner}
      />

      <Card id="credits" className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>Credit history</CardTitle>
            <CardDescription>Every credit grant, purchase and spend.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-1">
            {["", ...USAGE_CATS].map((c) => (
              <a key={c} href={`?cat=${c}#credits`} className={cn("rounded-md border px-2 py-1 text-xs", (sp.cat ?? "") === c ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
                {c ? titleCase(c) : "All"}
              </a>
            ))}
          </div>
        </CardHeader>
        <Table>
          <THead>
            <tr>
              <TH>Date</TH>
              <TH>Description</TH>
              <TH>Category</TH>
              <TH className="text-right">Amount</TH>
              <TH className="text-right">Balance</TH>
            </tr>
          </THead>
          <TBody>
            {txns.map((t) => (
              <TR key={t.id}>
                <TD className="whitespace-nowrap text-muted-foreground">{formatDateTime(t.createdAt)}</TD>
                <TD>{t.description}</TD>
                <TD>
                  <Badge>{titleCase(t.category)}</Badge>
                </TD>
                <TD className={cn("text-right font-medium tabular-nums", t.amount > 0 ? "text-success" : "")}>
                  {t.amount > 0 ? "+" : ""}
                  {formatNumber(t.amount)}
                </TD>
                <TD className="text-right tabular-nums text-muted-foreground">{formatNumber(t.balanceAfter)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
