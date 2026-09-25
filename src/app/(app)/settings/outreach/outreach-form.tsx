"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/components/hooks/use-action";
import { saveOutreachSettings } from "@/server/actions/settings";
import type { OutreachSettings } from "@/lib/outreach-settings";

export function OutreachSettingsForm({ initial, canEdit }: { initial: OutreachSettings; canEdit: boolean }) {
  const { exec, pending } = useAction();
  const [f, setF] = useState(initial);
  const toggle = (k: keyof OutreachSettings, label: string, hint: string) => (
    <label className="flex items-center justify-between gap-4 py-2">
      <span>
        <span className="text-[13px] font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={f[k] as boolean} onCheckedChange={(v) => setF({ ...f, [k]: v })} disabled={!canEdit} />
    </label>
  );
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Outreach defaults</CardTitle>
          <CardDescription>Applied to new campaigns. Each campaign can override them.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Daily limit / campaign">
            <Input type="number" value={f.defaultDailyLimit} onChange={(e) => setF({ ...f, defaultDailyLimit: Number(e.target.value) || 1 })} disabled={!canEdit} />
          </Field>
          <Field label="Window start (hour)">
            <Input type="number" min={0} max={23} value={f.sendWindowStart} onChange={(e) => setF({ ...f, sendWindowStart: Number(e.target.value) })} disabled={!canEdit} />
          </Field>
          <Field label="Window end (hour)">
            <Input type="number" min={1} max={24} value={f.sendWindowEnd} onChange={(e) => setF({ ...f, sendWindowEnd: Number(e.target.value) })} disabled={!canEdit} />
          </Field>
          <Field label="Timezone">
            <Input value={f.defaultTimezone} onChange={(e) => setF({ ...f, defaultTimezone: e.target.value })} disabled={!canEdit} />
          </Field>
        </div>
        <div className="divide-y rounded-lg border px-4">
          {toggle("skipWeekends", "Skip weekends", "Don’t send on Saturday or Sunday in the campaign timezone")}
          {toggle("trackOpens", "Track opens", "Adds an invisible pixel. Open rates are directional only.")}
          {toggle("trackClicks", "Track clicks", "Rewrites links — can hurt deliverability on first-touch emails")}
          {toggle("stopOnReply", "Stop on reply", "Remove a lead from the sequence as soon as they reply")}
        </div>
        <Field label="Auto-pause inbox when bounce rate exceeds (%)">
          <Input type="number" step={0.5} value={f.bounceThreshold} onChange={(e) => setF({ ...f, bounceThreshold: Number(e.target.value) })} className="max-w-[160px]" disabled={!canEdit} />
        </Field>
        <Field label="Opt-out line" hint="Appended to every campaign email to keep outreach compliant.">
          <Textarea rows={2} value={f.unsubscribeFooter} onChange={(e) => setF({ ...f, unsubscribeFooter: e.target.value })} disabled={!canEdit} />
        </Field>
      </CardContent>
      {canEdit && (
        <CardFooter className="justify-end">
          <Button loading={pending} onClick={() => exec(() => saveOutreachSettings(f))}>
            Save defaults
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
