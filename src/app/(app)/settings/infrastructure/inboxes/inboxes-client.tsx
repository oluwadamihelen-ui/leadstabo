"use client";
import { useState } from "react";
import { MoreHorizontal, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { useAction } from "@/components/hooks/use-action";
import { addInbox, deleteInbox, setInboxStatus, updateInbox } from "@/server/actions/infrastructure";
import { cn } from "@/lib/utils";

const PROVIDERS = [
  { key: "GOOGLE", label: "Google Workspace", hint: "OAuth — no password stored" },
  { key: "MICROSOFT", label: "Microsoft 365", hint: "OAuth — no password stored" },
  { key: "SMTP", label: "SMTP / IMAP", hint: "Any provider with SMTP" },
  { key: "OTHER", label: "Other", hint: "Zoho, Fastmail, etc." },
] as const;

export function AddInboxButton() {
  const { exec, pending } = useAction();
  const [open, setOpen] = useState(false);
  const empty = { provider: "GOOGLE" as (typeof PROVIDERS)[number]["key"], email: "", displayName: "", dailyLimit: 30, smtpHost: "", smtpPort: 587, username: "", password: "", signature: "", startWarmup: true };
  const [f, setF] = useState(empty);
  const smtp = f.provider === "SMTP" || f.provider === "OTHER";
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Add Inbox
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Connect a sending inbox" description="We test the connection before saving. Credentials are encrypted server-side." size="lg">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PROVIDERS.map((p) => (
              <button key={p.key} onClick={() => setF({ ...f, provider: p.key })} className={cn("rounded-lg border p-3 text-left", f.provider === p.key ? "border-primary ring-1 ring-primary/30" : "hover:border-foreground/20")}>
                <p className="text-[13px] font-medium">{p.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{p.hint}</p>
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Email address">
              <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="nick@getacme.com" />
            </Field>
            <Field label="Sender name">
              <Input value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} placeholder="Nick from Acme" />
            </Field>
            {smtp && (
              <>
                <Field label="SMTP host">
                  <Input value={f.smtpHost} onChange={(e) => setF({ ...f, smtpHost: e.target.value })} placeholder="smtp.provider.com" />
                </Field>
                <Field label="Port">
                  <Input type="number" value={f.smtpPort} onChange={(e) => setF({ ...f, smtpPort: Number(e.target.value) })} />
                </Field>
                <Field label="Username">
                  <Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} placeholder="Defaults to email" />
                </Field>
                <Field label="Password / app password">
                  <Input type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
                </Field>
              </>
            )}
            <Field label="Daily sending limit" hint="Start at 20–30; raise to 40 after warmup.">
              <Input type="number" min={1} max={200} value={f.dailyLimit} onChange={(e) => setF({ ...f, dailyLimit: Number(e.target.value) || 1 })} />
            </Field>
            <label className="flex items-center justify-between rounded-lg border px-3 text-[13px]">
              <span>
                Start warmup now
                <span className="block text-[11px] text-muted-foreground">Recommended for new inboxes</span>
              </span>
              <Switch checked={f.startWarmup} onCheckedChange={(v) => setF({ ...f, startWarmup: v })} />
            </label>
            <Field label="Signature" className="sm:col-span-2">
              <Textarea rows={2} value={f.signature} onChange={(e) => setF({ ...f, signature: e.target.value })} placeholder={"Nick Lawrence\nGrowth · Acme"} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              disabled={!f.email || !f.displayName}
              onClick={async () => {
                const ok = await exec(() => addInbox({ ...f, smtpHost: smtp ? f.smtpHost : undefined, smtpPort: smtp ? f.smtpPort : undefined, username: smtp ? f.username : undefined, password: smtp ? f.password : undefined }));
                if (ok) {
                  setOpen(false);
                  setF(empty);
                }
              }}
            >
              {f.provider === "GOOGLE" || f.provider === "MICROSOFT" ? "Connect with OAuth" : "Test & connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function InboxActions({ inbox }: { inbox: { id: string; email: string; displayName: string; dailyLimit: number; signature: string; status: string } }) {
  const { exec, pending } = useAction();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ displayName: inbox.displayName, dailyLimit: inbox.dailyLimit, signature: inbox.signature });
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Inbox actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => setEdit(true)}>
            <Pencil /> Edit limits & signature
          </DropdownMenuItem>
          {inbox.status === "CONNECTED" ? (
            <DropdownMenuItem onSelect={() => exec(() => setInboxStatus(inbox.id, "PAUSED"))}>
              <Pause /> Pause sending
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => exec(() => setInboxStatus(inbox.id, "CONNECTED"))}>
              <Play /> Reconnect / resume
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <Confirm
            title={`Disconnect ${inbox.email}?`}
            description="Stored credentials are deleted. Campaigns using it must be moved to another inbox."
            confirmLabel="Disconnect"
            onConfirm={async () => {
              await exec(() => deleteInbox(inbox.id));
            }}
            trigger={
              <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                <Trash2 /> Disconnect
              </DropdownMenuItem>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent title={`Edit ${inbox.email}`} size="sm">
          <div className="space-y-3">
            <Field label="Sender name">
              <Input value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} />
            </Field>
            <Field label="Daily limit">
              <Input type="number" min={1} max={200} value={f.dailyLimit} onChange={(e) => setF({ ...f, dailyLimit: Number(e.target.value) || 1 })} />
            </Field>
            <Field label="Signature">
              <Textarea rows={3} value={f.signature} onChange={(e) => setF({ ...f, signature: e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button loading={pending} onClick={async () => (await exec(() => updateInbox(inbox.id, f))) && setEdit(false)}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
