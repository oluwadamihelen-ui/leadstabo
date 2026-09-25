"use client";
import { useState } from "react";
import { Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Confirm } from "@/components/ui/confirm";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useAction } from "@/components/hooks/use-action";
import { buyCredits, cancelSubscription, changePlan } from "@/server/actions/settings";
import { cn, formatMoney, formatNumber } from "@/lib/utils";
import { IntervalToggle, PlanCards, type PlanRow } from "@/components/billing/plan-cards";

export function PlanPicker({ plans, currentKey, currentInterval, canChange }: { plans: PlanRow[]; currentKey: string | null; currentInterval: "MONTHLY" | "ANNUAL"; canChange: boolean }) {
  const { exec } = useAction();
  const [interval, setInterval] = useState<"MONTHLY" | "ANNUAL">(currentInterval);
  const [busy, setBusy] = useState<string | null>(null);
  const rows: [string, (p: PlanRow) => React.ReactNode][] = [
    ["Emails / month", (p) => formatNumber(p.monthlySends)],
    ["Lead credits / month", (p) => formatNumber(p.leadCredits)],
    ["Sending inboxes", (p) => formatNumber(p.inboxLimit)],
    ["Team members", (p) => formatNumber(p.teamMembers)],
    ["Support", (p) => p.supportLevel],
  ];
  const allFeatures = Array.from(new Set(plans.flatMap((p) => p.features.filter((f) => !f.startsWith("Everything")))));
  const has = (p: PlanRow, f: string) => {
    const idx = plans.findIndex((x) => x.key === p.key);
    return plans.slice(0, idx + 1).some((x) => x.features.includes(f));
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Plans</CardTitle>
          <CardDescription>{canChange ? "Upgrade or downgrade anytime. Changes apply immediately." : "Only the workspace owner can change plans."}</CardDescription>
        </div>
        <IntervalToggle value={interval} onChange={setInterval} />
      </CardHeader>
      <CardContent>
        <PlanCards
          plans={plans}
          interval={interval}
          currentKey={currentInterval === interval ? currentKey : null}
          busyKey={busy}
          onChoose={async (p) => {
            if (p.contactSales) return void (window.location.href = "mailto:sales@leadstabo.com?subject=Leadstabo%20Enterprise");
            if (!canChange) return;
            setBusy(p.key);
            const r = await exec(() => changePlan(p.key, interval));
            if (r && typeof r === "object" && "redirect" in r && r.redirect) window.location.href = r.redirect as string;
            else setBusy(null);
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
    </Card>
  );
}

export function BuyCredits({ packs }: { packs: { credits: number; priceMinor: number }[] }) {
  const { exec } = useAction();
  const [busy, setBusy] = useState<number | null>(null);
  return (
    <div className="mt-5 border-t pt-4">
      <p className="label-caps mb-2">Top up</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {packs.map((p) => (
          <Confirm
            key={p.credits}
            title={`Buy ${formatNumber(p.credits)} credits?`}
            description={`${formatMoney(p.priceMinor)} — you’ll complete payment on a secure checkout page. Credits never expire.`}
            confirmLabel="Buy credits"
            destructive={false}
            onConfirm={async () => {
              setBusy(p.credits);
              const r = await exec(() => buyCredits(p.credits));
              if (r && typeof r === "object" && "redirect" in r && r.redirect) window.location.href = r.redirect as string;
              else setBusy(null);
            }}
            trigger={
              <Button variant="secondary" className="h-auto flex-col gap-0 py-2" loading={busy === p.credits}>
                <span className="font-semibold">{formatNumber(p.credits)}</span>
                <span className="text-[11px] text-muted-foreground">{formatMoney(p.priceMinor)}</span>
              </Button>
            }
          />
        ))}
      </div>
    </div>
  );
}

export function CancelPlan() {
  const { exec } = useAction();
  return (
    <Confirm
      title="Cancel subscription?"
      description="Your plan stays active until the end of the current billing period. Campaigns will pause afterwards."
      confirmLabel="Cancel subscription"
      onConfirm={async () => {
        await exec(() => cancelSubscription());
      }}
      trigger={
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          Cancel subscription
        </Button>
      }
    />
  );
}
