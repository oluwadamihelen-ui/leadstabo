import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Crosshair } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { OutreachNav } from "@/components/section-nav";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { IcpDialogButton, OfferDialogButton, PlaybookMenu } from "./playbook-client";

export const metadata: Metadata = { title: "ICPs & Offers" };

export default async function PlaybookPage() {
  const ctx = await requireWorkspace();
  const [icps, offers] = await Promise.all([
    db.icp.findMany({ where: { workspaceId: ctx.workspaceId }, orderBy: { createdAt: "asc" } }),
    db.offer.findMany({ where: { workspaceId: ctx.workspaceId }, orderBy: { createdAt: "asc" } }),
  ]);
  const canEdit = ctx.role !== "VIEWER";

  return (
    <>
      <OutreachNav active="/outreach/playbook" />
      <div className="relative -mt-2 mb-8 overflow-hidden rounded-xl border bg-gradient-to-r from-violet/10 via-card to-primary/10 p-6">
        <h1 className="text-xl font-semibold tracking-tight">ICPs & Offers</h1>
        <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
          Save your Ideal Customer Profile and offer details once — the AI uses them to write on-target sequences automatically.{" "}
          <Link href="/outreach/campaigns/new" className="text-primary hover:underline">
            Try the AI generator →
          </Link>
        </p>
      </div>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Ideal Customer Profiles</h2>
            <p className="text-[13px] text-muted-foreground">Who you’re selling to — pains, goals, and objections</p>
          </div>
          {canEdit && <IcpDialogButton />}
        </div>
        {icps.length === 0 ? (
          <Card>
            <EmptyState icon={Crosshair} title="No ICPs yet" description="Define who you help so every email speaks to their pain." action={canEdit && <IcpDialogButton />} />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {icps.map((i) => (
              <Card key={i.id} className="p-5">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet/10">
                    <Crosshair className="size-4 text-violet" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">{i.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {i.industry} · {i.location}
                      {i.companySize && ` · ${i.companySize} employees`}
                    </p>
                  </div>
                  {canEdit && <PlaybookMenu kind="icp" item={i} />}
                </div>
                {i.titles.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Titles: {i.titles.join(", ")}</p>}
                <div className="mt-3 space-y-2">
                  {i.pains.map((p) => (
                    <p key={p} className="rounded-2xl border border-violet/25 bg-violet/10 px-3 py-2 text-xs leading-5 text-violet">
                      {p}
                    </p>
                  ))}
                </div>
                {i.goals.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Goals: {i.goals.join(" · ")}</p>}
                {i.objections.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Objections: {i.objections.join(" · ")}</p>}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Offer Templates</h2>
            <p className="text-[13px] text-muted-foreground">What you’re selling — value prop, proof, and CTA</p>
          </div>
          {canEdit && <OfferDialogButton />}
        </div>
        {offers.length === 0 ? (
          <Card>
            <EmptyState icon={Briefcase} title="No offers yet" description="Package what you sell so the AI can pitch it." action={canEdit && <OfferDialogButton />} />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {offers.map((o) => (
              <Card key={o.id} className="p-5">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Briefcase className="size-4 text-primary" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">{o.name}</p>
                    <p className="mt-0.5 text-xs font-medium text-primary">{o.pricing}</p>
                  </div>
                  {canEdit && <PlaybookMenu kind="offer" item={o} />}
                </div>
                <p className="mt-3 line-clamp-3 text-[13px] leading-5 text-foreground/85">{o.valueProp}</p>
                {o.proof && <p className="mt-2 text-xs text-muted-foreground">Proof: {o.proof}</p>}
                <span className="mt-3 inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">{o.cta}</span>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
