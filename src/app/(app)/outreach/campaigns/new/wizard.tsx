"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock, Inbox, Mail, Rocket, Save, Search, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Progress } from "@/components/ui/misc";
import { HealthScore, StatusBadge } from "@/components/status";
import { EmailComposer, type PreviewLead } from "@/components/outreach/email-composer";
import { newKey, SequenceBuilder, type BuilderStep } from "@/components/outreach/sequence-builder";
import { useAction } from "@/components/hooks/use-action";
import { createCampaign } from "@/server/actions/campaigns";
import { renderTemplate, variableMap } from "@/lib/services/personalization";
import { cn, formatNumber } from "@/lib/utils";

type WLead = PreviewLead & { email: string; emailStatus: string };
interface WInbox {
  id: string;
  email: string;
  domain: string;
  status: string;
  healthScore: number;
  dailyLimit: number;
  sentToday: number;
  warmup: string;
  signature: string | null;
}

const STEPS = ["Details", "Leads", "Inbox", "Write email", "Sequence", "Review", "Launch"];
const SENDABLE = ["VALID", "CATCH_ALL"];
const TIMEZONES = ["UTC", "America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Africa/Lagos", "Africa/Nairobi", "Africa/Johannesburg", "Asia/Dubai", "Asia/Singapore", "Australia/Sydney"];

export function CampaignWizard({
  lists,
  leads,
  inboxes,
  sequences,
  composer,
  defaults,
  initialListId,
}: {
  lists: { id: string; name: string; leadIds: string[]; total: number; verified: number }[];
  leads: WLead[];
  inboxes: WInbox[];
  sequences: { id: string; name: string; steps: Omit<BuilderStep, "key">[] }[];
  composer: { leads: PreviewLead[]; offers: { id: string; name: string; valueProp: string; cta: string; proof: string | null }[]; icps: { id: string; name: string; pains: string[] }[]; signature: string | null; senderName: string };
  defaults: { dailyLimit: number; windowStart: number; windowEnd: number; timezone: string; trackOpens: boolean; stopOnReply: boolean };
  initialListId?: string;
}) {
  const router = useRouter();
  const { exec, pending } = useAction();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState<"list" | "manual">("list");
  const [listId, setListId] = useState(initialListId ?? lists[0]?.id ?? "");
  const [manual, setManual] = useState<Set<string>>(new Set());
  const [leadQuery, setLeadQuery] = useState("");
  const [inboxId, setInboxId] = useState(inboxes.find((i) => i.status === "CONNECTED")?.id ?? "");
  const [dailyLimit, setDailyLimit] = useState(defaults.dailyLimit);
  const [windowStart, setWindowStart] = useState(defaults.windowStart);
  const [windowEnd, setWindowEnd] = useState(defaults.windowEnd);
  const [tz, setTz] = useState(defaults.timezone);
  const [trackOpens, setTrackOpens] = useState(defaults.trackOpens);
  const [stopOnReply, setStopOnReply] = useState(defaults.stopOnReply);
  const [offerId, setOfferId] = useState(composer.offers[0]?.id ?? "");
  const [steps, setSteps] = useState<BuilderStep[]>([
    { key: newKey(), subject: "{{first_name}}, quick idea for {{company_name}}", body: "Hi {{first_name}},\n\n\n\nWorth a quick chat next week?\n\n{{sender_name}}", delayDays: 0, enabled: true },
    { key: newKey(), subject: "Re: {{first_name}}, quick idea for {{company_name}}", body: "Hi {{first_name}},\n\nFloating this back up — any thoughts?\n\n{{sender_name}}", delayDays: 3, enabled: true },
    { key: newKey(), subject: "Re: {{first_name}}, quick idea for {{company_name}}", body: "Hi {{first_name}},\n\nOne more idea: …\n\n{{sender_name}}", delayDays: 7, enabled: true },
    { key: newKey(), subject: "should I close your file?", body: "Hi {{first_name}},\n\nI haven't heard back, so I'll assume the timing isn't right. If that changes, just reply “later”.\n\n{{sender_name}}", delayDays: 12, enabled: true },
  ]);

  const list = lists.find((l) => l.id === listId);
  const selectedLeadIds = source === "list" ? (list?.leadIds ?? []) : Array.from(manual);
  const selectedLeads = leads.filter((l) => selectedLeadIds.includes(l.id));
  const eligible = selectedLeads.filter((l) => SENDABLE.includes(l.emailStatus));
  const inbox = inboxes.find((i) => i.id === inboxId);
  const offer = composer.offers.find((o) => o.id === offerId) ?? null;
  const previewLeads: PreviewLead[] = (eligible.length ? eligible : composer.leads).slice(0, 25);
  const dailyVolume = Math.min(dailyLimit, inbox?.dailyLimit ?? dailyLimit);
  const enabled = steps.filter((s) => s.enabled);
  const lastDay = enabled.reduce((a, s) => Math.max(a, s.delayDays), 0);
  const durationDays = eligible.length ? Math.ceil(eligible.length / Math.max(1, dailyVolume)) + lastDay : 0;
  const totalEmails = eligible.length * enabled.length;

  const filteredLeads = useMemo(() => {
    const q = leadQuery.toLowerCase();
    return leads.filter((l) => !q || `${l.firstName} ${l.lastName} ${l.email} ${l.company ?? ""} ${l.title ?? ""}`.toLowerCase().includes(q)).slice(0, 200);
  }, [leads, leadQuery]);

  function validate(i: number): string | null {
    if (i === 0 && !name.trim()) return "Give your campaign a name";
    if (i === 1 && !selectedLeads.length) return "Select a list or at least one lead";
    if (i === 1 && !eligible.length) return "None of the selected leads are verified — verify them first";
    if (i === 2 && !inbox) return "Choose a sending inbox";
    if (i === 2 && windowEnd <= windowStart) return "Send window end must be after start";
    if (i === 3 && (!steps[0].subject.trim() || !steps[0].body.trim())) return "Write a subject and body for the first email";
    if (i === 4 && steps.some((s) => !s.subject.trim() || !s.body.trim())) return "Every step needs a subject and body";
    if (i === 4) for (let k = 1; k < steps.length; k++) if (steps[k].delayDays < steps[k - 1].delayDays) return `Step ${k + 1} must be on or after day ${steps[k - 1].delayDays}`;
    return null;
  }

  function go(to: number) {
    for (let i = 0; i < Math.min(to, STEPS.length - 1); i++) {
      const err = validate(i);
      if (err && to > i) {
        setStep(i);
        return toast.error(err);
      }
    }
    setStep(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(launch: boolean) {
    const res = await exec(
      () =>
        createCampaign({
          name,
          description,
          listId: source === "list" ? listId : undefined,
          leadIds: source === "manual" ? Array.from(manual) : undefined,
          inboxId,
          dailyLimit,
          sendWindowStart: windowStart,
          sendWindowEnd: windowEnd,
          timezone: tz,
          trackOpens,
          stopOnReply,
          steps: steps.map(({ subject, body, delayDays, enabled }) => ({ subject, body, delayDays, enabled })),
          launch,
        }),
      { refresh: false },
    );
    if (res && typeof res === "object" && "id" in res) router.push(`/outreach/campaigns/${(res as { id: string }).id}`);
  }

  const sample = previewLeads[0];
  const vars = variableMap(sample ? { ...sample, companyName: sample.company } : null, composer.senderName);

  return (
    <div>
      <Link href="/outreach/campaigns" className="mb-3 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Campaigns
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">New campaign</h1>
      <p className="mt-1 text-sm text-muted-foreground">Seven steps from list to launch.</p>

      {/* Stepper */}
      <ol className="my-6 flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <button onClick={() => go(i)} className="group w-full min-w-[96px] text-left">
              <div className={cn("h-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
              <p className={cn("mt-2 flex items-center gap-1.5 text-xs font-medium", i === step ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                <span className={cn("flex size-4 items-center justify-center rounded-full text-[9px]", i < step ? "bg-primary text-primary-foreground" : i === step ? "border border-primary text-primary" : "border")}>
                  {i < step ? <Check className="size-2.5" /> : i + 1}
                </span>
                {s}
              </p>
            </button>
          </li>
        ))}
      </ol>

      <div className="animate-fade-in" key={step}>
        {step === 0 && (
          <Card className="max-w-2xl p-6">
            <h2 className="text-lg font-semibold">Campaign details</h2>
            <div className="mt-4 space-y-4">
              <Field label="Campaign name">
                <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="US SaaS Founders — Q4" />
              </Field>
              <Field label="Description" hint="Internal only — helps your team understand the goal.">
                <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Outbound retainer offer to B2B SaaS founders, 11–200 employees" />
              </Field>
              {composer.offers.length > 0 && (
                <Field label="Offer (used by AI writing)">
                  <NativeSelect value={offerId} onChange={(e) => setOfferId(e.target.value)}>
                    <option value="">No offer</option>
                    {composer.offers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              )}
            </div>
          </Card>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="inline-flex rounded-lg border bg-muted/50 p-0.5 text-[13px]">
              {(["list", "manual"] as const).map((m) => (
                <button key={m} onClick={() => setSource(m)} className={cn("rounded-md px-3 py-1.5 font-medium", source === m ? "bg-card shadow-sm" : "text-muted-foreground")}>
                  {m === "list" ? "Existing lead list" : "Select leads manually"}
                </button>
              ))}
            </div>
            {source === "list" ? (
              lists.length === 0 ? (
                <Card>
                  <EmptyState icon={Users} title="No lead lists" description="Build a list first." action={<Button asChild><Link href="/leadgen/find">Find leads</Link></Button>} />
                </Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {lists.map((l) => (
                    <button key={l.id} onClick={() => setListId(l.id)} className={cn("rounded-xl border bg-card p-4 text-left transition-all", listId === l.id ? "border-primary ring-1 ring-primary/30" : "hover:border-foreground/20")}>
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{l.name}</p>
                        {listId === l.id && <Check className="size-4 text-primary" />}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {l.total} leads · {l.verified} verified
                      </p>
                      <Progress value={l.total ? (l.verified / l.total) * 100 : 0} tone="success" className="mt-3" />
                    </button>
                  ))}
                </div>
              )
            ) : (
              <Card className="overflow-hidden">
                <div className="flex items-center gap-2 border-b p-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input value={leadQuery} onChange={(e) => setLeadQuery(e.target.value)} placeholder="Search leads…" className="pl-8" />
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setManual(new Set(filteredLeads.filter((l) => SENDABLE.includes(l.emailStatus)).map((l) => l.id)))}>
                    Select all verified
                  </Button>
                </div>
                <div className="max-h-[420px] divide-y overflow-y-auto scrollbar-thin">
                  {filteredLeads.map((l) => {
                    const ok = SENDABLE.includes(l.emailStatus);
                    return (
                      <label key={l.id} className={cn("flex cursor-pointer items-center gap-3 px-3 py-2 text-[13px] hover:bg-muted/30", !ok && "opacity-60")}>
                        <Checkbox
                          checked={manual.has(l.id)}
                          onCheckedChange={(v) => {
                            const n = new Set(manual);
                            if (v) n.add(l.id);
                            else n.delete(l.id);
                            setManual(n);
                          }}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-medium">
                            {l.firstName} {l.lastName}
                          </span>
                          <span className="text-muted-foreground"> · {l.title} · {l.company}</span>
                        </span>
                        <StatusBadge status={l.emailStatus} />
                      </label>
                    );
                  })}
                </div>
              </Card>
            )}
            <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 text-[13px]">
              <span className="flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" /> <b>{selectedLeads.length}</b> leads selected
              </span>
              <span className="flex items-center gap-2 text-success">
                <ShieldCheck className="size-4" /> <b>{eligible.length}</b> verified & eligible
              </span>
              {selectedLeads.length > eligible.length && (
                <span className="text-warning">
                  {selectedLeads.length - eligible.length} unverified/invalid will be skipped —{" "}
                  <Link href="/leadgen/verify" className="underline">
                    verify them
                  </Link>
                </span>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              {inboxes.length === 0 && (
                <Card>
                  <EmptyState icon={Inbox} title="No sending inboxes" description="Connect an inbox before creating a campaign." action={<Button asChild><Link href="/settings/infrastructure/inboxes">Add inbox</Link></Button>} />
                </Card>
              )}
              {inboxes.map((i) => {
                const disabled = i.status !== "CONNECTED";
                return (
                  <button
                    key={i.id}
                    disabled={disabled}
                    onClick={() => setInboxId(i.id)}
                    className={cn(
                      "flex w-full flex-wrap items-center gap-4 rounded-xl border bg-card p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50",
                      inboxId === i.id ? "border-primary ring-1 ring-primary/30" : "hover:border-foreground/20",
                    )}
                  >
                    <span className={cn("flex size-9 items-center justify-center rounded-lg", inboxId === i.id ? "bg-primary text-primary-foreground" : "bg-muted")}>
                      <Mail className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{i.email}</p>
                      <p className="text-xs text-muted-foreground">{i.domain}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <StatusBadge status={i.status} />
                      <span className="text-muted-foreground">
                        Warmup <StatusBadge status={i.warmup} />
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        Health <HealthScore score={i.healthScore} />
                      </span>
                      <span className="w-28">
                        <span className="text-muted-foreground">
                          {i.sentToday}/{i.dailyLimit} today
                        </span>
                        <Progress value={(i.sentToday / Math.max(1, i.dailyLimit)) * 100} className="mt-1" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <Card className="h-fit space-y-4 p-5">
              <p className="font-semibold">Sending settings</p>
              <Field label="Campaign daily limit" hint={inbox ? `Inbox limit: ${inbox.dailyLimit}/day` : undefined}>
                <Input type="number" min={1} max={2000} value={dailyLimit} onChange={(e) => setDailyLimit(Math.max(1, Number(e.target.value) || 1))} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Send from">
                  <NativeSelect value={windowStart} onChange={(e) => setWindowStart(Number(e.target.value))}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Until">
                  <NativeSelect value={windowEnd} onChange={(e) => setWindowEnd(Number(e.target.value))}>
                    {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => (
                      <option key={h} value={h}>
                        {String(h % 24).padStart(2, "0")}:00
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
              <Field label="Timezone">
                <NativeSelect value={tz} onChange={(e) => setTz(e.target.value)}>
                  {(TIMEZONES.includes(tz) ? TIMEZONES : [tz, ...TIMEZONES]).map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </NativeSelect>
              </Field>
              <label className="flex items-center justify-between text-[13px]">
                Track opens <Switch checked={trackOpens} onCheckedChange={setTrackOpens} />
              </label>
              <label className="flex items-center justify-between text-[13px]">
                Stop sequence on reply <Switch checked={stopOnReply} onCheckedChange={setStopOnReply} />
              </label>
            </Card>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-4xl">
            <p className="mb-3 text-[13px] text-muted-foreground">Write your first email. Variables resolve in Preview using real lead data from your selection.</p>
            <EmailComposer
              subject={steps[0].subject}
              body={steps[0].body}
              onChange={(v) => setSteps(steps.map((s, i) => (i === 0 ? { ...s, ...v } : s)))}
              leads={previewLeads}
              offer={offer}
              icp={composer.icps[0] ?? null}
              signature={inbox?.signature ?? composer.signature}
              senderName={composer.senderName}
            />
          </div>
        )}

        {step === 4 && (
          <div>
            {sequences.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px]">
                <span className="text-muted-foreground">Start from a saved sequence:</span>
                <NativeSelect
                  className="w-auto"
                  value=""
                  onChange={(e) => {
                    const s = sequences.find((x) => x.id === e.target.value);
                    if (s) {
                      setSteps(s.steps.map((x) => ({ ...x, key: newKey() })));
                      toast.success(`Loaded “${s.name}”`);
                    }
                  }}
                >
                  <option value="">Choose…</option>
                  {sequences.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.steps.length} steps)
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}
            <SequenceBuilder steps={steps} onChange={setSteps} leads={previewLeads} offer={offer} icp={composer.icps[0] ?? null} signature={inbox?.signature ?? composer.signature} senderName={composer.senderName} />
          </div>
        )}

        {step === 5 && (
          <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
            <Card className="h-fit divide-y">
              {[
                ["Campaign", name],
                ["Leads", `${eligible.length} verified of ${selectedLeads.length}`],
                ["Inbox", inbox?.email ?? "—"],
                ["Daily volume", `${dailyVolume} emails/day`],
                ["Send window", `${String(windowStart).padStart(2, "0")}:00–${String(windowEnd % 24).padStart(2, "0")}:00 ${tz}`],
                ["Sequence", `${enabled.length} emails over ${lastDay} days`],
                ["Total emails", formatNumber(totalEmails)],
                ["Estimated duration", `~${durationDays} days`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 px-5 py-3 text-[13px]">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-right font-medium">{v}</span>
                </div>
              ))}
            </Card>
            <div className="space-y-3">
              <p className="text-[13px] text-muted-foreground">
                Preview for <b className="text-foreground">{sample ? `${sample.firstName} ${sample.lastName}` : "a sample lead"}</b>
                {sample?.company && ` at ${sample.company}`}
              </p>
              {enabled.map((s, i) => (
                <Card key={s.key} className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge tone="primary">Email {i + 1}</Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" /> Day {s.delayDays}
                    </span>
                  </div>
                  <p className="font-medium">{renderTemplate(s.subject, vars)}</p>
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-foreground/85">{renderTemplate(s.body, vars)}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === 6 && (
          <Card className="relative mx-auto max-w-xl overflow-hidden p-8 text-center">
            <div className="absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative">
              <div className="glow-primary mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Rocket className="size-6" />
              </div>
              <h2 className="mt-5 text-xl font-semibold">Ready to launch “{name}”</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {eligible.length} verified leads · {enabled.length}-step sequence · from {inbox?.email}. Emails send within your window at up to {dailyVolume}/day.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                <Button variant="secondary" onClick={() => submit(false)} loading={pending}>
                  <Save /> Save as draft
                </Button>
                <Button size="lg" onClick={() => submit(true)} loading={pending}>
                  <Rocket /> Launch Campaign
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {step < 6 && (
        <div className="sticky bottom-0 z-10 -mx-4 mt-8 flex items-center justify-between border-t bg-background/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
          <Button variant="secondary" onClick={() => go(step - 1)} disabled={step === 0}>
            <ArrowLeft /> Back
          </Button>
          <span className="text-xs text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </span>
          <Button
            onClick={() => {
              const err = validate(step);
              if (err) return toast.error(err);
              go(step + 1);
            }}
          >
            {step === 5 ? "Continue to launch" : "Next"} <ArrowRight />
          </Button>
        </div>
      )}
    </div>
  );
}
