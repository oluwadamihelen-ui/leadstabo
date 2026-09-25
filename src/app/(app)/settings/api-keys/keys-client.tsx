"use client";
import { useState } from "react";
import { AlertTriangle, Copy, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { useAction } from "@/components/hooks/use-action";
import { createApiKey, revokeApiKey } from "@/server/actions/settings";

export function CreateKeyButton() {
  const { exec, pending } = useAction();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState<string | null>(null);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Create key
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setKey(null);
            setName("");
          }
        }}
      >
        <DialogContent title={key ? "Copy your API key" : "Create API key"} size="sm">
          {key ? (
            <div className="space-y-3">
              <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" /> This is the only time the key is shown. Store it somewhere safe.
              </p>
              <div className="flex gap-2">
                <Input readOnly value={key} className="font-mono text-xs" />
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(key);
                    toast.success("Copied");
                  }}
                  aria-label="Copy key"
                >
                  <Copy />
                </Button>
              </div>
            </div>
          ) : (
            <Field label="Key name">
              <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HubSpot sync" />
            </Field>
          )}
          <DialogFooter>
            {key ? (
              <Button onClick={() => setOpen(false)}>Done</Button>
            ) : (
              <Button
                loading={pending}
                disabled={!name.trim()}
                onClick={async () => {
                  const r = await exec(() => createApiKey(name));
                  if (r && typeof r === "object" && "key" in r) setKey((r as { key: string }).key);
                }}
              >
                Create key
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RevokeKeyButton({ id, name }: { id: string; name: string }) {
  const { exec } = useAction();
  return (
    <Confirm
      title={`Revoke “${name}”?`}
      description="Any integration using this key will stop working immediately."
      confirmLabel="Revoke key"
      onConfirm={async () => {
        await exec(() => revokeApiKey(id));
      }}
      trigger={
        <Button variant="ghost" size="sm" className="text-destructive">
          Revoke
        </Button>
      }
    />
  );
}
