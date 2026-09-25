"use client";
import { useState } from "react";
import { CheckCircle2, ListPlus, Pause, Play, Rocket, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Confirm } from "@/components/ui/confirm";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";
import { useAction } from "@/components/hooks/use-action";
import { addLeadsToCampaign, removeCampaignLeads, sendDueNow, setCampaignStatus, updateCampaignSettings } from "@/server/actions/campaigns";
import { getListLeadIds } from "@/server/actions/lists-read";

export function CampaignControls({ id, status, isAdmin }: { id: string; status: string; isAdmin: boolean }) {
  const { exec, pending } = useAction();
  return (
    <>
      {status === "DRAFT" && (
        <Button loading={pending} onClick={() => exec(() => setCampaignStatus(id, "launch"))}>
          <Rocket /> Launch
        </Button>
      )}
      {status === "ACTIVE" && (
        <>
          {isAdmin && (
            <Tooltip content="Process due sends now, ignoring the send window (the worker does this automatically)">
              <Button variant="secondary" loading={pending} onClick={() => exec(() => sendDueNow(id))}>
                <Send /> Send due now
              </Button>
            </Tooltip>
          )}
          <Button variant="secondary" onClick={() => exec(() => setCampaignStatus(id, "pause"))}>
            <Pause /> Pause
          </Button>
        </>
      )}
      {status === "PAUSED" && (
        <Button onClick={() => exec(() => setCampaignStatus(id, "resume"))}>
          <Play /> Resume
        </Button>
      )}
      {(status === "ACTIVE" || status === "PAUSED") && (
        <Confirm
          title="Mark campaign complete?"
          description="Remaining scheduled emails won’t be sent."
          confirmLabel="Complete"
          destructive={false}
          onConfirm={async () => {
            await exec(() => setCampaignStatus(id, "complete"));
          }}
          trigger={
            <Button variant="ghost">
              <CheckCircle2 /> Complete
            </Button>
          }
        />
      )}
    </>
  );
}

export function RemoveLeadButton({ campaignId, leadId }: { campaignId: string; leadId: string }) {
  const { exec } = useAction();
  return (
    <Tooltip content="Remove from campaign">
      <Button variant="ghost" size="icon-sm" onClick={() => exec(() => removeCampaignLeads(campaignId, [leadId]))} aria-label="Remove from campaign">
        <X />
      </Button>
    </Tooltip>
  );
}

export function CampaignLeadsTools({ campaignId, lists }: { campaignId: string; lists: { id: string; name: string }[] }) {
  const { exec, pending } = useAction();
  const [open, setOpen] = useState(false);
  const [listId, setListId] = useState(lists[0]?.id ?? "");
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)} disabled={!lists.length}>
        <ListPlus /> Add leads from list
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Add leads from a list" description="Verified leads not already enrolled will be added." size="sm">
          <Field label="List">
            <NativeSelect value={listId} onChange={(e) => setListId(e.target.value)}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              onClick={async () => {
                const r = await getListLeadIds(listId);
                if (!r.ok || !r.data) return;
                if (await exec(() => addLeadsToCampaign({ campaignId, leadIds: r.data! }))) setOpen(false);
              }}
            >
              Add leads
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CampaignSettingsForm({
  initial,
  inboxes,
  canEdit,
}: {
  initial: { id: string; name: string; description: string; inboxId: string; dailyLimit: number; sendWindowStart: number; sendWindowEnd: number; timezone: string; trackOpens: boolean; stopOnReply: boolean };
  inboxes: { id: string; email: string; status: string }[];
  canEdit: boolean;
}) {
  const { exec, pending } = useAction();
  const [f, setF] = useState(initial);
  return (
    <Card className="max-w-2xl space-y-4 p-6">
      <Field label="Name">
        <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} disabled={!canEdit} />
      </Field>
      <Field label="Description">
        <Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} disabled={!canEdit} />
      </Field>
      <Field label="Sending inbox">
        <NativeSelect value={f.inboxId} onChange={(e) => setF({ ...f, inboxId: e.target.value })} disabled={!canEdit}>
          {inboxes.map((i) => (
            <option key={i.id} value={i.id} disabled={i.status !== "CONNECTED"}>
              {i.email} {i.status !== "CONNECTED" ? `(${i.status.toLowerCase()})` : ""}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Daily limit">
          <Input type="number" value={f.dailyLimit} onChange={(e) => setF({ ...f, dailyLimit: Number(e.target.value) || 1 })} disabled={!canEdit} />
        </Field>
        <Field label="Window start (hour)">
          <Input type="number" min={0} max={23} value={f.sendWindowStart} onChange={(e) => setF({ ...f, sendWindowStart: Number(e.target.value) })} disabled={!canEdit} />
        </Field>
        <Field label="Window end (hour)">
          <Input type="number" min={1} max={24} value={f.sendWindowEnd} onChange={(e) => setF({ ...f, sendWindowEnd: Number(e.target.value) })} disabled={!canEdit} />
        </Field>
      </div>
      <Field label="Timezone">
        <Input value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })} disabled={!canEdit} />
      </Field>
      <label className="flex items-center justify-between text-[13px]">
        Track opens <Switch checked={f.trackOpens} onCheckedChange={(v) => setF({ ...f, trackOpens: v })} disabled={!canEdit} />
      </label>
      <label className="flex items-center justify-between text-[13px]">
        Stop sequence on reply <Switch checked={f.stopOnReply} onCheckedChange={(v) => setF({ ...f, stopOnReply: v })} disabled={!canEdit} />
      </label>
      {canEdit && (
        <div className="flex justify-end">
          <Button
            loading={pending}
            onClick={() => {
              const { id, ...rest } = f;
              exec(() => updateCampaignSettings(id, rest));
            }}
          >
            Save settings
          </Button>
        </div>
      )}
    </Card>
  );
}
