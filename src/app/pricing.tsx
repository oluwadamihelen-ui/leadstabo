"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CurrencyToggle, IntervalToggle, PlanCards, type PlanRow } from "@/components/billing/plan-cards";
import type { Currency } from "@/lib/currency";

export function Pricing({ plans, ctaHref }: { plans: PlanRow[]; ctaHref: string }) {
  const router = useRouter();
  const [interval, setInterval] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [currency, setCurrency] = useState<Currency>("USD");
  return (
    <div className="mt-10">
      <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
        <CurrencyToggle value={currency} onChange={setCurrency} />
        <IntervalToggle value={interval} onChange={setInterval} />
      </div>
      <PlanCards
        plans={plans}
        interval={interval}
        currency={currency}
        onChoose={(p) => {
          if (p.contactSales) window.location.href = "mailto:sales@leadstabo.com?subject=Leadstabo%20Enterprise";
          else router.push(ctaHref === "/dashboard" ? "/settings/billing" : `/signup?plan=${p.key}`);
        }}
      />
    </div>
  );
}
