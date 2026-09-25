"use client";
import { useState } from "react";
import { KeyRound, MoreHorizontal, Pause, Pencil, Play, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { useAction } from "@/components/hooks/use-action";
import { addInbox, deleteInbox, reconnectInbox, setInboxStatus, syncInboxNow, updateInbox } from "@/server/actions/infrastructure";
import { cn } from "@/lib/utils";

const PROVIDERS = [
  { key: "GOOGLE", label: "Google Workspace", hint: "Gmail · app password" },
  { key: "MICROSOFT", label: "Microsoft 365", hint: "Outlook · SMTP AUTH" },
  { key: "SMTP", label: "Custom SMTP / IMAP", hint: "Zoho, Fastmail, cPanel…" },
] as const;

const HELP: Record<string, React.ReactNode> = {
  GOOGLE: (
    <>
      Turn on 2-Step Verification for the mailbox, then create an <b>app password</b> at{" "}
      <a className="text-primary underline" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer noopener">
        myaccount.google.com/apppasswords
      </a>
      . IMAP must be enabled (Gmail settings → Forwarding and POP/IMAP). We connect to smtp.gmail.com and imap.gmail.com.
    </>
  ),
  MICROSOFT: (
    <>
      An admin must enable <b>Authenticated SMTP</b> for this mailbox (Microsoft 365 admin → Users → Mail → Manage email apps). Use the account password or an{" "}
      <a className="text-primary underline" href="https://account.microsoft.com/security" target="_blank" rel="noreferrer noopener">
        app password
      </a>{" "}
      if MFA is on. We connect to smtp.office365.com and outlook.office365.com.
    </>
  ),
  SMTP: <>Enter the SMTP (sending) and IMAP (reply sync) settings from your email provider. Port 465/993 use SSL; 587 uses STARTTLS.</>,
};

export function AddInboxButton() {
  const { exec, pending } = useAction();
  const [open, setOpen] = useState(false);
  const empty = {
    provider: "GOOGLE" as (typeof PROVIDERS)[number]["key"],
    email: "",
    displayName: "",
    password: "",
    dailyLimit: 30,
    smtpHost: "",
    smtpPort: 587,
    imapHost: "",
    imapPort: 993,
    username: "",
    signature: "",
    startWarmup: true,
  };
  const [f, setF] = useState(empty);
  const custom = f.provider === "SMTP";
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Add Inbox
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Connect a sending inbox" description="We test SMTP (sending) and IMAP (reply sync) before saving. Credentials are encrypted on the server." size="lg">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PROVIDERS.map((p) => (
              <button key={p.key} type="button" onClick={() => setF({ ...f, provider: p.key })} className={cn("rounded-lg border p-3 text-left", f.provider === p.key ? "border-primary ring-1 ring-primary/30" : "hover:border-foreground/20")}>
                <p className="text-[13px] font-medium">{p.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{p.hint}</p>
              </button>
            ))}
          </div>
          <p className="mt-3 rounded-lg border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">{HELP[f.provider]}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Email address">
              <Input type="email" autoComplete="off" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="nick@getacme.com" />
            </Field>
            <Field label="Sender name">
              <Input value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} placeholder="Nick from Acme" />
            </Field>
            <Field label={custom ? "Password" : "App password"} className="sm:col-span-2">
              <Input type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder={custom ? "" : "xxxx xxxx xxxx xxxx"} />
            </Field>
            {custom && (
              <>
                <Field label="SMTP host">
                  <Input value={f.smtpHost} onChange={(e) => setF({ ...f, smtpHost: e.target.value })} placeholder="smtp.provider.com" />
                </Field>
                <Field label="SMTP port">
                  <Input type="number" value={f.smtpPort} onChange={(e) => setF({ ...f, smtpPort: Number(e.target.value) })} />
                </Field>
                <Field label="IMAP host">
                  <Input value={f.imapHost} onChange={(e) => setF({ ...f, imapHost: e.target.value })} placeholder="imap.provider.com" />
                </Field>
                <Field label="IMAP port">
                  <Input type="number" value={f.imapPort} onChange={(e) => setF({ ...f, imapPort: Number(e.target.value) })} />
                </Field>
                <Field label="Username" hint="Defaults to the email address" className="sm:col-span-2">
                  <Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
                </Field>
              </>
            )}
            <Field label="Daily sending limit" hint="Start at 20–30; raise to 40 after warmup.">
              <Input type="number" min={1} max={200} value={f.dailyLimit} onChange={(e) => setF({ ...f, dailyLimit: Number(e.target.value) || 1 })} />
            </Field>
            <label className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-[13px]">
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
              disabled={!f.email || !f.displayName || !f.password || (custom && (!f.smtpHost || !f.imapHost))}
              onClick={async () => {
                const ok = await exec(() =>
                  addInbox({
                    provider: f.provider,
                    email: f.email,
                    displayName: f.displayName,
                    password: f.password,
                    dailyLimit: f.dailyLimit,
                    signature: f.signature,
                    startWarmup: f.startWarmup,
                    ...(custom ? { smtpHost: f.smtpHost, smtpPort: f.smtpPort, imapHost: f.imapHost, imapPort: f.imapPort, username: f.username } : {}),
                  }),
                );
                if (ok) {
                  setOpen(false);
                  setF(empty);
                }
              }}
            >
              Test & connect
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
  const [reconnect, setReconnect] = useState(false);
  const [pw, setPw] = useState("");
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
          <DropdownMenuItem onSelect={() => exec(() => syncInboxNow(inbox.id))}>
            <RefreshCw /> Sync replies now
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setReconnect(true)}>
            <KeyRound /> Update password / reconnect
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEdit(true)}>
            <Pencil /> Edit limits & signature
          </DropdownMenuItem>
          {inbox.status === "CONNECTED" ? (
            <DropdownMenuItem onSelect={() => exec(() => setInboxStatus(inbox.id, "PAUSED"))}>
              <Pause /> Pause sending
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => exec(() => setInboxStatus(inbox.id, "CONNECTED"))}>
              <Play /> Resume sending
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
      <Dialog open={reconnect} onOpenChange={setReconnect}>
        <DialogContent title={`Reconnect ${inbox.email}`} description="Enter the current app password. We re-test SMTP and IMAP before saving." size="sm">
          <Field label="App password">
            <Input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button
              loading={pending}
              disabled={!pw}
              onClick={async () => {
                if (await exec(() => reconnectInbox(inbox.id, pw))) {
                  setReconnect(false);
                  setPw("");
                }
              }}
            >
              Test & save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
