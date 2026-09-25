"use client";
import { useState } from "react";
import { MoreHorizontal, Pause, Play, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { useAction } from "@/components/hooks/use-action";
import { configureWarmup, setWarmup } from "@/server/actions/infrastructure";

export function WarmupActions({ inboxId, status, targetPerDay, rampIncrement }: { inboxId: string; status: string; targetPerDay: number; rampIncrement: number }) {
  const { exec, pending } = useAction();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ targetPerDay, rampIncrement });
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Warmup actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {status === "ACTIVE" ? (
            <DropdownMenuItem onSelect={() => exec(() => setWarmup(inboxId, "pause"))}>
              <Pause /> Pause warmup
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => exec(() => setWarmup(inboxId, "start"))}>
              <Play /> {status === "NOT_STARTED" ? "Start warmup" : "Resume warmup"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setOpen(true)}>
            <SlidersHorizontal /> Configure limits
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Warmup limits" description="Warmup volume ramps daily by the increment until it reaches the target." size="sm">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target emails/day">
              <Input type="number" min={5} max={100} value={f.targetPerDay} onChange={(e) => setF({ ...f, targetPerDay: Number(e.target.value) })} />
            </Field>
            <Field label="Daily ramp">
              <Input type="number" min={1} max={10} value={f.rampIncrement} onChange={(e) => setF({ ...f, rampIncrement: Number(e.target.value) })} />
            </Field>
          </div>
          <DialogFooter>
            <Button loading={pending} onClick={async () => (await exec(() => configureWarmup(inboxId, f))) && setOpen(false)}>
              Save limits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
