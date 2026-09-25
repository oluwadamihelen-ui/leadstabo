"use client";
import * as React from "react";
import * as A from "@radix-ui/react-alert-dialog";
import { Button } from "./button";

/** Confirmation dialog for destructive or irreversible actions. */
export function Confirm({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = true,
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  return (
    <A.Root open={open} onOpenChange={setOpen}>
      <A.Trigger asChild>{trigger}</A.Trigger>
      <A.Portal>
        <A.Overlay className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-[2px]">
        <A.Content className="relative w-full max-w-md rounded-xl border bg-popover p-5 shadow-2xl animate-fade-in">
          <A.Title className="text-base font-semibold">{title}</A.Title>
          <A.Description className="mt-1.5 text-[13px] text-muted-foreground">{description}</A.Description>
          <div className="mt-5 flex justify-end gap-2">
            <A.Cancel asChild>
              <Button variant="secondary">Cancel</Button>
            </A.Cancel>
            <Button
              variant={destructive ? "destructive" : "default"}
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                  setOpen(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </A.Content>
        </A.Overlay>
      </A.Portal>
    </A.Root>
  );
}
