"use client";
import { useState } from "react";
import { Copy, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { aiAssist } from "@/server/actions/ai";

/** Floating AI copywriter available on every screen. */
export function AssistantButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ firstName: "", company: "", title: "", industry: "", offer: "" });
  const [out, setOut] = useState<{ subject?: string; body?: string } | null>(null);

  async function generate() {
    setBusy(true);
    const res = await aiAssist("generate_email", {
      lead: { firstName: form.firstName || "there", company: form.company || null, title: form.title || null, industry: form.industry || null },
      offer: form.offer ? { name: "Offer", valueProp: form.offer, cta: "Open to a quick 15-minute chat next week?" } : null,
    });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    setOut(res.data ?? null);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glow-primary fixed bottom-5 right-5 z-40 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
        aria-label="Open AI assistant"
      >
        <Sparkles className="size-5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Leadabo AI" description="Draft a personalized cold email in seconds. Uses 2 credits per generation." size="lg">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Prospect first name">
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="Amara" />
            </Field>
            <Field label="Company">
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Summit Health" />
            </Field>
            <Field label="Job title">
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Head of Growth" />
            </Field>
            <Field label="Industry">
              <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Healthcare" />
            </Field>
            <Field label="What you sell (value proposition)" className="sm:col-span-2">
              <Textarea rows={2} value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} placeholder="We book 15+ qualified demos a month for B2B clinics using done-for-you outbound" />
            </Field>
          </div>
          <Button className="mt-4 w-full" onClick={generate} loading={busy}>
            <Wand2 /> Generate email
          </Button>
          {out && (
            <div className="mt-4 rounded-lg border bg-surface p-4 animate-fade-in">
              <div className="mb-2 flex items-center justify-between">
                <p className="label-caps">Draft</p>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(`Subject: ${out.subject}\n\n${out.body}`);
                    toast.success("Copied to clipboard");
                  }}
                >
                  <Copy /> Copy
                </Button>
              </div>
              <p className="text-sm font-medium">{out.subject}</p>
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-foreground/85">{out.body}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
