"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Eye, MoreHorizontal, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { useAction } from "@/components/hooks/use-action";
import { addDomain, deleteDomain, verifyDomain } from "@/server/actions/infrastructure";

export function AddDomainButton() {
  const router = useRouter();
  const { exec, pending } = useAction();
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState("");
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Add Domain
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Add a sending domain" description="Step 1 of 6 — we’ll generate the DNS records you need to publish." size="sm">
          <Field label="Domain" hint="Use a secondary domain (e.g. getacme.com), never your primary one.">
            <Input autoFocus value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="getacme.com" />
          </Field>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              disabled={!domain.trim()}
              onClick={async () => {
                const r = await exec(() => addDomain(domain), { refresh: false });
                if (r && typeof r === "object" && "id" in r) router.push(`/settings/infrastructure/domains/${(r as { id: string }).id}`);
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DomainRowActions({ id, domain, afterDelete }: { id: string; domain: string; afterDelete?: string }) {
  const router = useRouter();
  const { exec } = useAction();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Domain actions">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => router.push(`/settings/infrastructure/domains/${id}`)}>
          <Eye /> DNS setup
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => exec(() => verifyDomain(id))}>
          <RefreshCw /> Verify DNS
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <Confirm
          title={`Remove ${domain}?`}
          description="Inboxes on this domain stay connected but lose domain health tracking."
          confirmLabel="Remove domain"
          onConfirm={async () => {
            const ok = await exec(() => deleteDomain(id), { refresh: !afterDelete });
            if (ok && afterDelete) router.push(afterDelete);
          }}
          trigger={
            <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
              <Trash2 /> Remove
            </DropdownMenuItem>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function VerifyDnsButton({ id }: { id: string }) {
  const { exec, pending } = useAction();
  return (
    <Button loading={pending} onClick={() => exec(() => verifyDomain(id))}>
      <RefreshCw /> Verify DNS
    </Button>
  );
}

export function CopyValue({ value }: { value: string }) {
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        toast.success("Copied");
      }}
      className="group flex max-w-full items-center gap-1.5 text-left font-mono text-xs hover:text-primary"
    >
      <span className="break-all">{value}</span>
      <Copy className="size-3 shrink-0 opacity-50 group-hover:opacity-100" />
    </button>
  );
}
