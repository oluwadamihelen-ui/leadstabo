"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/input";

/** Pick an existing list or name a new one. */
export function AddToListDialog({
  open,
  onOpenChange,
  lists,
  count,
  costNote,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lists: { id: string; name: string }[];
  count: number;
  costNote?: string;
  onSubmit: (target: { listId?: string; newListName?: string }) => Promise<unknown>;
}) {
  const [mode, setMode] = useState<"existing" | "new">(lists.length ? "existing" : "new");
  const [listId, setListId] = useState(lists[0]?.id ?? "");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Add ${count} lead${count === 1 ? "" : "s"} to a list`} description={costNote} size="sm">
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border bg-muted/50 p-0.5 text-[13px]">
          {(["existing", "new"] as const).map((m) => (
            <button
              key={m}
              disabled={m === "existing" && !lists.length}
              onClick={() => setMode(m)}
              className={`rounded-md py-1.5 font-medium disabled:opacity-40 ${mode === m ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              {m === "existing" ? "Existing list" : "New list"}
            </button>
          ))}
        </div>
        {mode === "existing" ? (
          <Field label="List">
            <NativeSelect value={listId} onChange={(e) => setListId(e.target.value)}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : (
          <Field label="List name">
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. US SaaS Founders" />
          </Field>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={mode === "new" ? !name.trim() : !listId}
            onClick={async () => {
              setBusy(true);
              const ok = await onSubmit(mode === "new" ? { newListName: name } : { listId });
              setBusy(false);
              if (ok) {
                onOpenChange(false);
                setName("");
              }
            }}
          >
            Add to list
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
