"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IntervalToggle, PlanCards, type PlanRow } from "@/components/billing/plan-cards";

export function Pricing({ plans, ctaHref }: { plans: PlanRow[]; ctaHref: string }) {
  const router = useRouter();
  const [interval, setInterval] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  return (
    <div className="mt-10">
      <div className="mb-8 flex justify-center">
        <IntervalToggle value={interval} onChange={setInterval} />
      </div>
      <PlanCards
        plans={plans}
        interval={interval}
        onChoose={(p) => {
          if (p.contactSales) window.location.href = "mailto:sales@leadstabo.com?subject=Leadstabo%20Enterprise";
          else router.push(ctaHref === "/dashboard" ? "/settings/billing" : `/signup?plan=${p.key}`);
        }}
      />
    </div>
  );
}
