"use client";
import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bold,
  Braces,
  CheckCircle2,
  ChevronDown,
  Eye,
  Italic,
  Link2,
  List,
  Loader2,
  MousePointerClick,
  Pencil,
  Signature,
  Sparkles,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/tooltip";
import { aiAssist } from "@/server/actions/ai";
import { renderTemplate, VARIABLES, variableMap } from "@/lib/services/personalization";
import { spamReport } from "@/lib/services/spam";
import { cn } from "@/lib/utils";
import { formatEmailHtml } from "@/lib/email-html";
import type { AiTask } from "@/lib/providers/types";

export interface PreviewLead {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  company: string | null;
  industry: string | null;
  location: string | null;
}

export interface OfferLite {
  name: string;
  valueProp: string;
  cta: string;
  proof: string | null;
}

const CTAS = [
  "Worth a quick 15-minute chat next week?",
  "Open to seeing how this would work for {{company_name}}?",
  "Mind if I send over a 2-minute video walkthrough?",
  "Who’s the best person to speak with about this?",
  "Does Tuesday or Thursday afternoon work for a quick call?",
];

const AI_ACTIONS: { task: AiTask; label: string }[] = [
  { task: "generate_email", label: "Generate email" },
  { task: "improve", label: "Improve email" },
  { task: "shorten", label: "Make it shorter" },
  { task: "personalize", label: "Make it more personalized" },
  { task: "subject_lines", label: "Generate subject lines" },
  { task: "rewrite_cta", label: "Rewrite CTA" },
  { task: "follow_up", label: "Create follow-up" },
];

export { formatEmailHtml };

export function EmailComposer({
  subject,
  body,
  onChange,
  leads,
  offer,
  icp,
  signature,
  senderName,
  stepNumber = 1,
  compact,
}: {
  subject: string;
  body: string;
  onChange: (next: { subject: string; body: string }) => void;
  leads: PreviewLead[];
  offer?: OfferLite | null;
  icp?: { name: string; pains: string[] } | null;
  signature?: string | null;
  senderName: string;
  stepNumber?: number;
  compact?: boolean;
}) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [rich, setRich] = useState(true);
  const [withSig, setWithSig] = useState(!!signature);
  const [leadId, setLeadId] = useState(leads[0]?.id ?? "");
  const [aiBusy, setAiBusy] = useState<AiTask | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);

  const lead = leads.find((l) => l.id === leadId) ?? null;
  const vars = variableMap(lead ? { ...lead, companyName: lead.company } : null, senderName);
  const report = useMemo(() => spamReport(subject, body), [subject, body]);

  function insert(text: string, wrap?: [string, string]) {
    const el = ta.current;
    if (!el) return onChange({ subject, body: body + text });
    const { selectionStart: s, selectionEnd: e } = el;
    const selected = body.slice(s, e);
    const piece = wrap ? `${wrap[0]}${selected || text}${wrap[1]}` : text;
    const next = body.slice(0, s) + piece + body.slice(e);
    onChange({ subject, body: next });
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = s + piece.length;
    });
  }

  async function runAi(task: AiTask) {
    setAiBusy(task);
    const res = await aiAssist(task, {
      lead: lead ? { firstName: lead.firstName, lastName: lead.lastName, title: lead.title, company: lead.company, industry: lead.industry, location: lead.location } : undefined,
      offer: offer ?? null,
      icp: icp ?? null,
      subject,
      body,
      stepNumber,
    });
    setAiBusy(null);
    if (!res.ok) return toast.error(res.error);
    const r = res.data!;
    if (task === "subject_lines" && r.subjects) {
      setSubjects(r.subjects);
      return toast.success("Pick a subject line below");
    }
    if (task === "rewrite_cta" && r.text) {
      const paras = body.split(/\n{2,}/);
      const idx = paras.findIndex((p) => p.trim().endsWith("?"));
      if (idx >= 0) paras[idx] = r.text;
      else paras.splice(Math.max(1, paras.length - 1), 0, r.text);
      onChange({ subject, body: paras.join("\n\n") });
      return toast.success("CTA rewritten");
    }
    // AI works from real lead data; turn the previewed lead's values back into variables so the copy stays reusable.
    const tokenize = (s?: string) => {
      if (!s || !lead) return s;
      let out = s;
      if (lead.company) out = out.split(lead.company).join("{{company_name}}");
      if (lead.firstName) out = out.replace(new RegExp(`\\b${lead.firstName}\\b`, "g"), "{{first_name}}");
      return out;
    };
    onChange({ subject: tokenize(r.subject) ?? subject, body: tokenize(r.body) ?? body });
    toast.success("Draft updated — review before sending");
  }

  const tone = report.level === "low" ? "text-success" : report.level === "medium" ? "text-warning" : "text-destructive";
  const previewBody = renderTemplate(body, vars) + (withSig && signature ? `\n\n${signature}` : "");

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {/* Header: subject */}
      <div className="border-b p-3">
        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-xs text-muted-foreground">Subject</span>
          <Input value={subject} onChange={(e) => onChange({ subject: e.target.value, body })} placeholder="{{first_name}}, quick idea for {{company_name}}" className="h-8 border-0 bg-transparent px-0 text-[14px] font-medium focus-visible:ring-0" />
        </div>
        {subjects.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 pl-16">
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => {
                  onChange({ subject: s, body });
                  setSubjects([]);
                }}
                className="rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-xs hover:bg-primary/10"
              >
                {s}
              </button>
            ))}
            <button onClick={() => setSubjects([])} className="px-1 text-xs text-muted-foreground hover:text-foreground">
              dismiss
            </button>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 px-2 py-1.5">
        <div className="mr-1 inline-flex rounded-md border bg-background p-0.5 text-xs">
          <button onClick={() => setMode("edit")} className={cn("flex items-center gap-1 rounded px-2 py-1", mode === "edit" ? "bg-accent font-medium" : "text-muted-foreground")}>
            <Pencil className="size-3" /> Write
          </button>
          <button onClick={() => setMode("preview")} className={cn("flex items-center gap-1 rounded px-2 py-1", mode === "preview" ? "bg-accent font-medium" : "text-muted-foreground")}>
            <Eye className="size-3" /> Preview
          </button>
        </div>
        {mode === "edit" && rich && (
          <>
            <ToolButton label="Bold" onClick={() => insert("bold text", ["**", "**"])}>
              <Bold />
            </ToolButton>
            <ToolButton label="Italic" onClick={() => insert("italic text", ["_", "_"])}>
              <Italic />
            </ToolButton>
            <ToolButton label="Link" onClick={() => insert("link text", ["[", "](https://)"])}>
              <Link2 />
            </ToolButton>
            <ToolButton label="Bullet" onClick={() => insert("\n- ")}>
              <List />
            </ToolButton>
            <span className="mx-1 h-4 w-px bg-border" />
          </>
        )}
        {mode === "edit" && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="xs" variant="ghost">
                  <Braces /> Variables <ChevronDown className="!size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Insert personalization</DropdownMenuLabel>
                {VARIABLES.map((v) => (
                  <DropdownMenuItem key={v.key} onSelect={() => insert(`{{${v.key}}}`)}>
                    <code className="text-xs text-primary">{`{{${v.key}}}`}</code>
                    <span className="ml-auto text-xs text-muted-foreground">{v.label}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => insert("{{first_name|there}}")}>
                  <code className="text-xs text-primary">{"{{first_name|there}}"}</code>
                  <span className="ml-auto text-xs text-muted-foreground">With fallback</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="xs" variant="ghost">
                  <MousePointerClick /> CTA <ChevronDown className="!size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80">
                <DropdownMenuLabel>Insert a call-to-action</DropdownMenuLabel>
                {(offer ? [offer.cta, ...CTAS] : CTAS).map((c) => (
                  <DropdownMenuItem key={c} onSelect={() => insert(`\n\n${c}`)}>
                    {c}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="xs" variant="subtle" disabled={!!aiBusy}>
                {aiBusy ? <Loader2 className="animate-spin" /> : <Sparkles />} AI assist
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60">
              <DropdownMenuLabel>2 credits per action · uses {lead ? lead.firstName : "sample"}’s data</DropdownMenuLabel>
              {AI_ACTIONS.map((a) => (
                <DropdownMenuItem key={a.task} onSelect={() => runAi(a.task)}>
                  <Sparkles /> {a.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Body */}
      {mode === "edit" ? (
        <textarea
          ref={ta}
          value={body}
          onChange={(e) => onChange({ subject, body: e.target.value })}
          placeholder={"Hi {{first_name}},\n\n…"}
          className={cn("block w-full resize-y bg-transparent p-4 font-sans text-[14px] leading-6 outline-none placeholder:text-muted-foreground/60", compact ? "min-h-[200px]" : "min-h-[300px]")}
        />
      ) : (
        <div className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Preview as</span>
            <NativeSelect className="h-7 w-auto text-xs" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              {leads.length === 0 && <option value="">Sample lead</option>}
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.firstName} {l.lastName} — {l.company}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-xs text-muted-foreground">
              To: {lead ? `${lead.firstName} ${lead.lastName}` : "Sample lead"} · From: {senderName}
            </p>
            <p className="mt-2 text-[15px] font-semibold">{renderTemplate(subject, vars) || "(no subject)"}</p>
            <div className="mt-3 whitespace-pre-wrap text-[14px] leading-6" dangerouslySetInnerHTML={{ __html: formatEmailHtml(previewBody, rich) }} />
          </div>
        </div>
      )}

      {/* Footer: stats */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <Tooltip
          content={
            report.issues.length ? (
              <ul className="list-disc space-y-0.5 pl-3">
                {report.issues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            ) : (
              "No deliverability issues found"
            )
          }
        >
          <span className={cn("flex cursor-help items-center gap-1 font-medium", tone)}>
            {report.level === "low" ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
            Spam risk: {report.level} ({report.score})
          </span>
        </Tooltip>
        <span>{report.words} words</span>
        <span>{report.chars} chars</span>
        <label className="flex items-center gap-1.5">
          <Type className="size-3.5" /> Rich text
          <Switch checked={rich} onCheckedChange={setRich} className="scale-75" />
        </label>
        {signature && (
          <label className="flex items-center gap-1.5">
            <Signature className="size-3.5" /> Signature
            <Switch checked={withSig} onCheckedChange={setWithSig} className="scale-75" />
          </label>
        )}
      </div>
    </div>
  );
}

function ToolButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip content={label}>
      <button type="button" onClick={onClick} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground [&_svg]:size-3.5" aria-label={label}>
        {children}
      </button>
    </Tooltip>
  );
}
