"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { StatusBadge } from "@/components/status";
import { SequenceBuilder, type BuilderStep } from "@/components/outreach/sequence-builder";
import type { PreviewLead } from "@/components/outreach/email-composer";
import { useAction } from "@/components/hooks/use-action";
import { saveSequence } from "@/server/actions/sequences";
import { SequenceMenu } from "../sequence-client";

interface Composer {
  leads: PreviewLead[];
  offers: { id: string; name: string; valueProp: string; cta: string; proof: string | null }[];
  icps: { id: string; name: string; pains: string[] }[];
  signature: string | null;
  senderName: string;
}

export function SequenceEditor({
  sequence,
  campaigns,
  composer,
  canEdit,
}: {
  sequence: { id: string; name: string; description: string; steps: BuilderStep[] };
  campaigns: { id: string; name: string; status: string }[];
  composer: Composer;
  canEdit: boolean;
}) {
  const { exec, pending } = useAction();
  const [name, setName] = useState(sequence.name);
  const [description, setDescription] = useState(sequence.description);
  const [steps, setSteps] = useState(sequence.steps);
  const [offerId, setOfferId] = useState(composer.offers[0]?.id ?? "");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  async function save() {
    const ok = await exec(() => saveSequence(sequence.id, { name, description, steps: steps.map(({ id, subject, body, delayDays, enabled }) => ({ id, subject, body, delayDays, enabled })) }));
    if (ok) setDirty(false);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (canEdit) save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <>
      <Link href="/outreach/sequences" className="mb-3 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Sequences
      </Link>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
            className="h-auto border-0 bg-transparent px-0 text-2xl font-semibold tracking-tight focus-visible:ring-0"
            aria-label="Sequence name"
            disabled={!canEdit}
          />
          <Input
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setDirty(true);
            }}
            placeholder="Add a description…"
            className="h-auto border-0 bg-transparent px-0 text-sm text-muted-foreground focus-visible:ring-0"
            aria-label="Description"
            disabled={!canEdit}
          />
          {campaigns.length > 0 && (
            <p className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
              Used by:
              {campaigns.map((c) => (
                <Link key={c.id} href={`/outreach/campaigns/${c.id}`} className="flex items-center gap-1 hover:text-foreground">
                  {c.name} <StatusBadge status={c.status} />
                </Link>
              ))}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {composer.offers.length > 0 && (
            <NativeSelect className="w-auto" value={offerId} onChange={(e) => setOfferId(e.target.value)} aria-label="Offer for AI">
              <option value="">No offer context</option>
              {composer.offers.map((o) => (
                <option key={o.id} value={o.id}>
                  AI offer: {o.name}
                </option>
              ))}
            </NativeSelect>
          )}
          {canEdit && (
            <>
              <SequenceMenu id={sequence.id} afterDelete="/outreach/sequences" />
              <Button onClick={save} loading={pending}>
                <Save /> {dirty ? "Save changes" : "Saved"}
              </Button>
            </>
          )}
        </div>
      </div>
      <SequenceBuilder
        steps={steps}
        onChange={(s) => {
          setSteps(s);
          setDirty(true);
        }}
        leads={composer.leads}
        offer={composer.offers.find((o) => o.id === offerId) ?? null}
        icp={composer.icps[0] ?? null}
        signature={composer.signature}
        senderName={composer.senderName}
      />
    </>
  );
}
