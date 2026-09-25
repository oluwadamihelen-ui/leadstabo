"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Download, FolderOpen, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Confirm } from "@/components/ui/confirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { useAction } from "@/components/hooks/use-action";
import { createList, deleteList, duplicateList, renameList } from "@/server/actions/leads";

export function NewListButton() {
  const router = useRouter();
  const { exec, pending } = useAction();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> New list
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Create a lead list" size="sm">
          <div className="space-y-3">
            <Field label="Name">
              <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Dentists — California" />
            </Field>
            <Field label="Description">
              <Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Who is in this segment?" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              disabled={!name.trim()}
              onClick={async () => {
                const res = await exec(() => createList({ name, description: desc }));
                if (res && typeof res === "object" && "id" in res) router.push(`/leadgen/lists/${(res as { id: string }).id}`);
              }}
            >
              Create list
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ListMenu({ id, name, onDeleted }: { id: string; name: string; onDeleted?: string }) {
  const router = useRouter();
  const { exec, pending } = useAction();
  const [rename, setRename] = useState(false);
  const [value, setValue] = useState(name);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="List actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => router.push(`/leadgen/lists/${id}`)}>
            <FolderOpen /> Open
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setRename(true)}>
            <Pencil /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => exec(() => duplicateList(id))}>
            <Copy /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => (window.location.href = `/api/export/leads?list=${id}`)}>
            <Download /> Export CSV
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <Confirm
            title={`Delete “${name}”?`}
            description="The list is removed; its leads stay in All Leads. Campaigns using it keep their enrolled leads."
            confirmLabel="Delete list"
            onConfirm={async () => {
              const ok = await exec(() => deleteList(id), { refresh: !onDeleted });
              if (ok && onDeleted) router.push(onDeleted);
            }}
            trigger={
              <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={rename} onOpenChange={setRename}>
        <DialogContent title="Rename list" size="sm">
          <Input autoFocus value={value} onChange={(e) => setValue(e.target.value)} />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRename(false)}>
              Cancel
            </Button>
            <Button loading={pending} onClick={async () => (await exec(() => renameList(id, value))) && setRename(false)}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
