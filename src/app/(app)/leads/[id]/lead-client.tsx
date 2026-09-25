"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MailCheck, Pencil, Rocket, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { AddToCampaignDialog } from "@/components/leads/leads-table";
import { useAction } from "@/components/hooks/use-action";
import { addLeadNote, deleteLeadNote, deleteLeads, updateLead, verifyLeads } from "@/server/actions/leads";
import { addLeadsToCampaign } from "@/server/actions/campaigns";
import { timeAgo } from "@/lib/utils";

interface EditableLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  phone: string;
  location: string;
  linkedinUrl: string;
}

export function LeadActions({ lead, campaigns }: { lead: EditableLead; campaigns: { id: string; name: string; status: string }[] }) {
  const router = useRouter();
  const { exec, pending } = useAction();
  const [edit, setEdit] = useState(false);
  const [camp, setCamp] = useState(false);
  const [f, setF] = useState(lead);
  const set = (k: keyof EditableLead) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => setCamp(true)}>
        <Rocket /> Add to campaign
      </Button>
      <Button variant="secondary" loading={pending} onClick={() => exec(() => verifyLeads({ leadIds: [lead.id] }))}>
        <MailCheck /> Verify email
      </Button>
      <Button variant="secondary" onClick={() => document.getElementById("note-input")?.focus()}>
        Add note
      </Button>
      <Button variant="secondary" onClick={() => setEdit(true)}>
        <Pencil /> Edit
      </Button>
      <Confirm
        title="Remove this lead?"
        description="The lead will be deleted from every list and campaign. This can’t be undone."
        confirmLabel="Remove lead"
        onConfirm={async () => {
          const ok = await exec(() => deleteLeads([lead.id]), { refresh: false });
          if (ok) router.push("/leads");
        }}
        trigger={
          <Button variant="ghost" className="text-destructive">
            <Trash2 /> Remove
          </Button>
        }
      />

      {camp && (
        <AddToCampaignDialog campaigns={campaigns} count={1} onClose={() => setCamp(false)} onSubmit={(campaignId) => exec(() => addLeadsToCampaign({ campaignId, leadIds: [lead.id] }))} />
      )}

      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent title="Edit lead">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name">
              <Input value={f.firstName} onChange={set("firstName")} />
            </Field>
            <Field label="Last name">
              <Input value={f.lastName} onChange={set("lastName")} />
            </Field>
            <Field label="Email" className="sm:col-span-2" hint="Changing the email resets its verification status.">
              <Input value={f.email} onChange={set("email")} />
            </Field>
            <Field label="Job title">
              <Input value={f.title} onChange={set("title")} />
            </Field>
            <Field label="Phone">
              <Input value={f.phone} onChange={set("phone")} />
            </Field>
            <Field label="Location">
              <Input value={f.location} onChange={set("location")} />
            </Field>
            <Field label="LinkedIn URL">
              <Input value={f.linkedinUrl} onChange={set("linkedinUrl")} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEdit(false)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              onClick={async () => {
                const { id, ...rest } = f;
                if (await exec(() => updateLead(id, rest))) setEdit(false);
              }}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function NoteForm({ leadId }: { leadId: string }) {
  const { exec, pending } = useAction();
  const [body, setBody] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (await exec(() => addLeadNote(leadId, body))) setBody("");
      }}
      className="space-y-2"
    >
      <Textarea id="note-input" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a note — call summary, context, next steps…" />
      <Button size="sm" type="submit" loading={pending} disabled={!body.trim()}>
        Save note
      </Button>
    </form>
  );
}

export function NoteItem({ id, author, body, at, canDelete }: { id: string; author: string; body: string; at: string; canDelete: boolean }) {
  const { exec } = useAction();
  return (
    <div className="group rounded-lg border bg-muted/30 p-3">
      <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {author} · {timeAgo(at)}
        </span>
        {canDelete && (
          <button onClick={() => exec(() => deleteLeadNote(id))} className="opacity-0 transition-opacity group-hover:opacity-100" aria-label="Delete note">
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <p className="whitespace-pre-wrap text-[13px]">{body}</p>
    </div>
  );
}
