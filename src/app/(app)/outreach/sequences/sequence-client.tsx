"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { Confirm } from "@/components/ui/confirm";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { useAction } from "@/components/hooks/use-action";
import { createSequence, deleteSequence, duplicateSequence } from "@/server/actions/sequences";

export function NewSequenceButton() {
  const router = useRouter();
  const { exec, pending } = useAction();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> New sequence
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="New sequence" description="Starts with a proven 3-step template you can edit." size="sm">
          <Field label="Name">
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Founder outreach — v2" />
          </Field>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              disabled={!name.trim()}
              onClick={async () => {
                const r = await exec(() => createSequence({ name }), { refresh: false });
                if (r && typeof r === "object" && "id" in r) router.push(`/outreach/sequences/${(r as { id: string }).id}`);
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SequenceMenu({ id, afterDelete }: { id: string; afterDelete?: string }) {
  const router = useRouter();
  const { exec } = useAction();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Sequence actions">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => router.push(`/outreach/sequences/${id}`)}>
          <Pencil /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={async () => {
            const r = await exec(() => duplicateSequence(id));
            if (r && typeof r === "object" && "id" in r) router.push(`/outreach/sequences/${(r as { id: string }).id}`);
          }}
        >
          <Copy /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <Confirm
          title="Delete this sequence?"
          description="Campaigns using it will lose their steps. Sequences used by active campaigns can’t be deleted."
          confirmLabel="Delete"
          onConfirm={async () => {
            const ok = await exec(() => deleteSequence(id), { refresh: !afterDelete });
            if (ok && afterDelete) router.push(afterDelete);
          }}
          trigger={
            <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
