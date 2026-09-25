"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, CreditCard, Lock, Minus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { CurrencyToggle, IntervalToggle, PlanCards, type PlanRow } from "@/components/billing/plan-cards";
import { setBillingCurrency, startCreditCheckout, startPlanCheckout } from "@/server/actions/settings";
import { CREDIT_PACKS, packPrice, planChargeAmount, type Currency } from "@/lib/currency";
import { cn, formatMoney, formatNumber } from "@/lib/utils";

export interface GatewayOption {
  key: string;
  label: string;
  live: boolean;
  currencies: Currency[];
}

type Purchase =
  | { kind: "plan"; plan: PlanRow; interval: "MONTHLY" | "ANNUAL" }
  | { kind: "credits"; credits: number };

const GATEWAY_HINT: Record<string, string> = {
  paystack: "Cards, bank transfer, USSD",
  flutterwave: "Cards, bank transfer, mobile money",
  korapay: "Cards and bank transfer",
  test: "No real charge — for trying the app",
};

/** Currency switch persisted to the workspace. */
export function BillingCurrencySwitch({ currency, canChange }: { currency: Currency; canChange: boolean }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [value, setValue] = useState(currency);
  return (
    <CurrencyToggle
      value={value}
      onChange={(c) => {
        setValue(c);
        if (canChange) void setBillingCurrency(c).then(() => start(() => router.refresh()));
        else start(() => router.refresh());
      }}
    />
  );
}

/** Pick a gateway and go to its hosted checkout. */
export function CheckoutDialog({
  purchase,
  currency,
  gateways,
  onClose,
}: {
  purchase: Purchase;
  currency: Currency;
  gateways: GatewayOption[];
  onClose: () => void;
}) {
  const usable = gateways.filter((g) => g.currencies.includes(currency));
  const [gateway, setGateway] = useState(usable[0]?.key ?? "");
  const [busy, setBusy] = useState(false);
  const amount =
    purchase.kind === "plan"
      ? planChargeAmount(purchase.plan, currency, purchase.interval)
      : packPrice(CREDIT_PACKS.find((p) => p.credits === purchase.credits)!, currency);
  const title = purchase.kind === "plan" ? `${purchase.plan.name} plan — ${purchase.interval === "ANNUAL" ? "12 months" : "1 month"}` : `${formatNumber(purchase.credits)} credits`;

  async function pay() {
    setBusy(true);
    const res =
      purchase.kind === "plan"
        ? await startPlanCheckout({ planKey: purchase.plan.key, interval: purchase.interval, gateway, currency })
        : await startCreditCheckout({ credits: purchase.credits, gateway, currency });
    if (!res.ok) {
      setBusy(false);
      return toast.error(res.error);
    }
    window.location.href = res.data!.redirect;
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Checkout" description="You’ll finish paying on the payment provider’s secure page, then come straight back here." size="md">
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
          <div>
            <p className="text-[13px] font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">Paid in {currency === "NGN" ? "Naira" : "US Dollars"}</p>
          </div>
          <p className="text-xl font-semibold tabular-nums">{formatMoney(amount, currency)}</p>
        </div>
        <p className="label-caps mb-2 mt-5">Pay with</p>
        {usable.length === 0 ? (
          <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-[13px] text-warning">
            No payment provider accepts {currency} yet. Switch currency, or ask the admin to connect Paystack, Flutterwave or Korapay.
          </p>
        ) : (
          <div className="space-y-2">
            {usable.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setGateway(g.key)}
                className={cn("flex w-full items-center gap-3 rounded-lg border p-3 text-left", gateway === g.key ? "border-primary ring-1 ring-primary/30" : "hover:border-foreground/20")}
              >
                <span className={cn("flex size-4 items-center justify-center rounded-full border", gateway === g.key && "border-primary bg-primary")}>
                  {gateway === g.key && <span className="size-1.5 rounded-full bg-primary-foreground" />}
                </span>
                <span className="flex-1">
                  <span className="block text-[13px] font-medium">{g.label}</span>
                  <span className="block text-xs text-muted-foreground">{GATEWAY_HINT[g.key]}</span>
                </span>
                <CreditCard className="size-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={pay} loading={busy} disabled={!gateway}>
            <Lock /> Pay {formatMoney(amount, currency)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PlanPicker({
  plans,
  currentKey,
  currentInterval,
  currency,
  gateways,
  canChange,
  renewable,
}: {
  plans: PlanRow[];
  currentKey: string | null;
  currentInterval: "MONTHLY" | "ANNUAL";
  currency: Currency;
  gateways: GatewayOption[];
  canChange: boolean;
  renewable: boolean;
}) {
  const [interval, setInterval] = useState<"MONTHLY" | "ANNUAL">(currentInterval);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const rows: [string, (p: PlanRow) => React.ReactNode][] = [
    ["Emails / month", (p) => formatNumber(p.monthlySends)],
    ["Lead credits / month", (p) => formatNumber(p.leadCredits)],
    ["Sending inboxes", (p) => formatNumber(p.inboxLimit)],
    ["Team members", (p) => formatNumber(p.teamMembers)],
    ["Support", (p) => p.supportLevel],
  ];
  const allFeatures = Array.from(new Set(plans.flatMap((p) => p.features.filter((f) => !f.startsWith("Everything")))));
  const has = (p: PlanRow, f: string) => plans.slice(0, plans.findIndex((x) => x.key === p.key) + 1).some((x) => x.features.includes(f));

  return (
    <Card>
      <CardHeader className="flex-wrap">
        <div>
          <CardTitle>Plans</CardTitle>
          <CardDescription>
            {canChange ? "Prepaid monthly or yearly. Nothing renews automatically — we remind you before your plan ends." : "Only the workspace owner can change plans."}
          </CardDescription>
        </div>
        <IntervalToggle value={interval} onChange={setInterval} />
      </CardHeader>
      <CardContent>
        <PlanCards
          plans={plans}
          interval={interval}
          currency={currency}
          currentKey={currentInterval === interval ? currentKey : null}
          actionLabel={(p) => (p.contactSales ? "Contact sales" : p.key === currentKey && currentInterval === interval ? (renewable ? "Renew plan" : "Extend plan") : `Choose ${p.name}`)}
          onChoose={(p) => {
            if (p.contactSales) return void (window.location.href = "mailto:sales@leadstabo.com?subject=Leadstabo%20Enterprise");
            if (!canChange) return toast.error("Only the workspace owner can change plans");
            setPurchase({ kind: "plan", plan: p, interval });
          }}
        />
        <div className="mt-8">
          <p className="mb-3 text-[13px] font-semibold">Compare plans</p>
          <Table>
            <THead>
              <tr>
                <TH>Feature</TH>
                {plans.map((p) => (
                  <TH key={p.key} className={cn("text-center", p.recommended && "text-primary")}>
                    {p.name}
                  </TH>
                ))}
              </tr>
            </THead>
            <TBody>
              {rows.map(([label, fn]) => (
                <TR key={label}>
                  <TD>{label}</TD>
                  {plans.map((p) => (
                    <TD key={p.key} className="text-center tabular-nums">
                      {fn(p)}
                    </TD>
                  ))}
                </TR>
              ))}
              {allFeatures.map((f) => (
                <TR key={f}>
                  <TD>{f}</TD>
                  {plans.map((p) => (
                    <TD key={p.key} className="text-center">
                      {has(p, f) ? <Check className="mx-auto size-4 text-success" /> : <Minus className="mx-auto size-4 text-muted-foreground/40" />}
                    </TD>
                  ))}
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </CardContent>
      {purchase && <CheckoutDialog purchase={purchase} currency={currency} gateways={gateways} onClose={() => setPurchase(null)} />}
    </Card>
  );
}

export function RenewButton({ plan, interval, currency, gateways }: { plan: PlanRow; interval: "MONTHLY" | "ANNUAL"; currency: Currency; gateways: GatewayOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Renew {plan.name}
      </Button>
      {open && <CheckoutDialog purchase={{ kind: "plan", plan, interval }} currency={currency} gateways={gateways} onClose={() => setOpen(false)} />}
    </>
  );
}

export function BuyCredits({ currency, gateways }: { currency: Currency; gateways: GatewayOption[] }) {
  const [credits, setCredits] = useState<number | null>(null);
  return (
    <div className="mt-5 border-t pt-4">
      <p className="label-caps mb-2">Top up</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CREDIT_PACKS.map((p) => (
          <Button key={p.credits} variant="secondary" className="h-auto flex-col gap-0 py-2" onClick={() => setCredits(p.credits)}>
            <span className="font-semibold">{formatNumber(p.credits)}</span>
            <span className="text-[11px] text-muted-foreground">{formatMoney(packPrice(p, currency), currency)}</span>
          </Button>
        ))}
      </div>
      {credits && <CheckoutDialog purchase={{ kind: "credits", credits }} currency={currency} gateways={gateways} onClose={() => setCredits(null)} />}
    </div>
  );
}
