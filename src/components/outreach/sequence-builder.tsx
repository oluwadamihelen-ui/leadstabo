"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, Clock, Copy, Eye, EyeOff, Mail, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";
import { renderTemplate, variableMap } from "@/lib/services/personalization";
import { cn } from "@/lib/utils";
import { EmailComposer, type OfferLite, type PreviewLead } from "./email-composer";

export interface BuilderStep {
  key: string;
  id?: string;
  subject: string;
  body: string;
  delayDays: number;
  enabled: boolean;
}

let counter = 0;
export const newKey = () => `s${Date.now().toString(36)}${counter++}`;

/** Visual, vertical sequence editor: select a node to edit it in the composer. */
export function SequenceBuilder({
  steps,
  onChange,
  leads,
  offer,
  icp,
  signature,
  senderName,
}: {
  steps: BuilderStep[];
  onChange: (steps: BuilderStep[]) => void;
  leads: PreviewLead[];
  offer?: OfferLite | null;
  icp?: { name: string; pains: string[] } | null;
  signature?: string | null;
  senderName: string;
}) {
  const [active, setActive] = useState(steps[0]?.key ?? "");
  const [previewAll, setPreviewAll] = useState(false);
  const idx = Math.max(0, steps.findIndex((s) => s.key === active));
  const current = steps[idx];

  const update = (i: number, patch: Partial<BuilderStep>) => onChange(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    // Keep delays monotonic: swap delays so days stay in order.
    const d = next[i].delayDays;
    next[i] = { ...next[i], delayDays: next[j].delayDays };
    next[j] = { ...next[j], delayDays: d };
    next[0] = { ...next[0], delayDays: 0 };
    onChange(next);
  }

  function add() {
    const last = steps[steps.length - 1];
    const s: BuilderStep = {
      key: newKey(),
      subject: last ? (last.subject.startsWith("Re:") ? last.subject : `Re: ${last.subject}`) : "{{first_name}}, quick idea",
      body: "Hi {{first_name}},\n\n\n\n{{sender_name}}",
      delayDays: last ? last.delayDays + (steps.length >= 3 ? 5 : 3) : 0,
      enabled: true,
    };
    onChange([...steps, s]);
    setActive(s.key);
  }

  function duplicate(i: number) {
    const s = { ...steps[i], key: newKey(), id: undefined, delayDays: steps[i].delayDays + 2 };
    const next = [...steps.slice(0, i + 1), s, ...steps.slice(i + 1)];
    for (let k = i + 2; k < next.length; k++) if (next[k].delayDays < next[k - 1].delayDays) next[k] = { ...next[k], delayDays: next[k - 1].delayDays };
    onChange(next);
    setActive(s.key);
  }

  function remove(i: number) {
    if (steps.length === 1) return;
    const next = steps.filter((_, j) => j !== i);
    next[0] = { ...next[0], delayDays: 0 };
    onChange(next);
    setActive(next[Math.max(0, i - 1)].key);
  }

  const totalDays = steps.filter((s) => s.enabled).reduce((a, s) => Math.max(a, s.delayDays), 0);
  const sample = leads[0];
  const vars = variableMap(sample ? { ...sample, companyName: sample.company } : null, senderName);

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[13px] text-muted-foreground">
            {steps.filter((s) => s.enabled).length} emails over {totalDays} days
          </p>
          <Button size="xs" variant="ghost" onClick={() => setPreviewAll(!previewAll)}>
            {previewAll ? <EyeOff /> : <Eye />} {previewAll ? "Hide" : "Preview"}
          </Button>
        </div>
        <ol className="space-y-0">
          {steps.map((s, i) => (
            <li key={s.key}>
              {i > 0 && (
                <div className="flex items-center gap-2 py-1.5 pl-5">
                  <div className="flex flex-col items-center">
                    <span className="h-3 w-px bg-border" />
                    <ArrowDown className="size-3 text-muted-foreground" />
                  </div>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="size-3" /> wait {s.delayDays - steps[i - 1].delayDays} day{s.delayDays - steps[i - 1].delayDays === 1 ? "" : "s"}
                  </span>
                </div>
              )}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActive(s.key)}
                onKeyDown={(e) => e.key === "Enter" && setActive(s.key)}
                className={cn(
                  "group relative cursor-pointer rounded-xl border bg-card p-3 transition-all",
                  active === s.key ? "border-primary/60 ring-1 ring-primary/30" : "hover:border-foreground/20",
                  !s.enabled && "opacity-50",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", active === s.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    <Mail className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="label-caps text-foreground/90">
                      Email {i + 1} <span className="text-muted-foreground">· Day {s.delayDays}</span>
                    </p>
                    <p className="truncate text-[13px]">{s.subject || "(no subject)"}</p>
                  </div>
                  <Switch checked={s.enabled} onCheckedChange={(v) => update(i, { enabled: v })} onClick={(e) => e.stopPropagation()} aria-label="Enable step" />
                </div>
                {previewAll && (
                  <div className="mt-2 rounded-md border bg-background p-2.5 text-xs leading-5">
                    <p className="font-medium">{renderTemplate(s.subject, vars)}</p>
                    <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-muted-foreground">{renderTemplate(s.body, vars)}</p>
                  </div>
                )}
                <div className="mt-2 flex items-center gap-0.5 border-t pt-2" onClick={(e) => e.stopPropagation()}>
                  <Tooltip content="Move up">
                    <button disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30" aria-label="Move up">
                      <ArrowUp className="size-3.5" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Move down">
                    <button disabled={i === steps.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30" aria-label="Move down">
                      <ArrowDown className="size-3.5" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Duplicate step">
                    <button onClick={() => duplicate(i)} className="rounded p-1 text-muted-foreground hover:bg-accent" aria-label="Duplicate">
                      <Copy className="size-3.5" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Delete step">
                    <button disabled={steps.length === 1} onClick={() => remove(i)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30" aria-label="Delete">
                      <Trash2 className="size-3.5" />
                    </button>
                  </Tooltip>
                  {i > 0 && (
                    <label className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      Send on day
                      <Input
                        type="number"
                        min={steps[i - 1].delayDays}
                        max={365}
                        value={s.delayDays}
                        onChange={(e) => update(i, { delayDays: Math.max(0, Math.min(365, Number(e.target.value) || 0)) })}
                        className="h-6 w-14 px-1.5 text-xs"
                      />
                    </label>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <Button variant="secondary" className="mt-3 w-full border-dashed" onClick={add} disabled={steps.length >= 12}>
          <Plus /> Add email
        </Button>
      </div>

      {current && (
        <div className="min-w-0">
          <p className="mb-2 text-[13px] font-medium">
            Editing email {idx + 1} <span className="text-muted-foreground">· sent on day {current.delayDays}</span>
          </p>
          <EmailComposer
            key={current.key}
            subject={current.subject}
            body={current.body}
            onChange={(v) => update(idx, v)}
            leads={leads}
            offer={offer}
            icp={icp}
            signature={signature}
            senderName={senderName}
            stepNumber={idx + 1}
          />
        </div>
      )}
    </div>
  );
}
