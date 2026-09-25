"use client";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatMoney, formatNumber } from "@/lib/utils";

export interface PlanRow {
  key: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  monthlySends: number;
  leadCredits: number;
  inboxLimit: number;
  teamMembers: number;
  supportLevel: string;
  features: string[];
  recommended: boolean;
  contactSales: boolean;
}

export function PlanCards({ plans, interval, currentKey, onChoose, busyKey }: { plans: PlanRow[]; interval: "MONTHLY" | "ANNUAL"; currentKey?: string | null; onChoose: (p: PlanRow) => void; busyKey?: string | null }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {plans.map((p) => {
        const price = interval === "ANNUAL" ? p.annualPrice : p.monthlyPrice;
        const current = currentKey === p.key;
        return (
          <div key={p.key} className={cn("relative flex flex-col rounded-xl border bg-card p-5", p.recommended && "border-primary/60 glow-primary")}>
            {p.recommended && (
              <span className="absolute -top-2.5 left-5 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                <Sparkles className="size-3" /> Recommended
              </span>
            )}
            <div className="flex items-center justify-between">
              <p className="font-semibold">{p.name}</p>
              {current && <Badge tone="success">Current</Badge>}
            </div>
            <p className="mt-1 min-h-[36px] text-xs text-muted-foreground">{p.tagline}</p>
            <div className="mt-4">
              {p.contactSales ? (
                <p className="text-3xl font-semibold tracking-tight">Custom</p>
              ) : (
                <p className="text-3xl font-semibold tracking-tight">
                  {formatMoney(price, p.currency)}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
              )}
              <p className="mt-0.5 h-4 text-xs text-muted-foreground">{!p.contactSales && interval === "ANNUAL" ? `${formatMoney(price * 12, p.currency)} billed yearly` : ""}</p>
            </div>
            <ul className="mt-4 flex-1 space-y-2 text-[13px]">
              <li className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {formatNumber(p.monthlySends)} emails / month
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {formatNumber(p.leadCredits)} lead credits
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {p.inboxLimit} sending inboxes
              </li>
              {p.features.slice(0, 3).map((f) => (
                <li key={f} className="flex gap-2 text-muted-foreground">
                  <Check className="mt-0.5 size-4 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Button className="mt-5 w-full" variant={p.recommended ? "default" : "secondary"} disabled={current} loading={busyKey === p.key} onClick={() => onChoose(p)}>
              {current ? "Current plan" : p.contactSales ? "Contact sales" : "Choose " + p.name}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export function IntervalToggle({ value, onChange }: { value: "MONTHLY" | "ANNUAL"; onChange: (v: "MONTHLY" | "ANNUAL") => void }) {
  return (
    <div className="inline-flex rounded-lg border bg-muted/50 p-0.5 text-[13px]">
      {(["MONTHLY", "ANNUAL"] as const).map((v) => (
        <button key={v} onClick={() => onChange(v)} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium", value === v ? "bg-card shadow-sm" : "text-muted-foreground")}>
          {v === "MONTHLY" ? "Monthly" : "Annual"}
          {v === "ANNUAL" && <span className="rounded bg-success/15 px-1 text-[10px] text-success">-20%</span>}
        </button>
      ))}
    </div>
  );
}

