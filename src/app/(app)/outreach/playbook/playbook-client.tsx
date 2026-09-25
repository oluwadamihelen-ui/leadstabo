"use client";
import { useState } from "react";
import { Copy, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Confirm } from "@/components/ui/confirm";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { useAction } from "@/components/hooks/use-action";
import { deletePlaybookItem, duplicatePlaybookItem, saveIcp, saveOffer } from "@/server/actions/playbook";

interface Icp {
  id: string;
  name: string;
  industry: string;
  location: string;
  companySize: string | null;
  titles: string[];
  pains: string[];
  goals: string[];
  objections: string[];
}
interface Offer {
  id: string;
  name: string;
  pricing: string;
  valueProp: string;
  proof: string | null;
  cta: string;
}

const split = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

function IcpDialog({ open, onOpenChange, icp }: { open: boolean; onOpenChange: (v: boolean) => void; icp?: Icp }) {
  const { exec, pending } = useAction();
  const [f, setF] = useState({
    name: icp?.name ?? "",
    industry: icp?.industry ?? "",
    location: icp?.location ?? "",
    companySize: icp?.companySize ?? "",
    titles: icp?.titles.join("\n") ?? "",
    pains: icp?.pains.join("\n") ?? "",
    goals: icp?.goals.join("\n") ?? "",
    objections: icp?.objections.join("\n") ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={icp ? "Edit ICP" : "New Ideal Customer Profile"} description="One item per line for titles, pains, goals and objections." size="lg">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2">
            <Input value={f.name} onChange={set("name")} placeholder="Nigerian private school owners" />
          </Field>
          <Field label="Industry">
            <Input value={f.industry} onChange={set("industry")} placeholder="Education Management" />
          </Field>
          <Field label="Location">
            <Input value={f.location} onChange={set("location")} placeholder="Nigeria" />
          </Field>
          <Field label="Company size">
            <Input value={f.companySize} onChange={set("companySize")} placeholder="11-200" />
          </Field>
          <Field label="Job titles">
            <Textarea rows={3} value={f.titles} onChange={set("titles")} placeholder={"Proprietor\nHead of School"} />
          </Field>
          <Field label="Pains" className="sm:col-span-2">
            <Textarea rows={3} value={f.pains} onChange={set("pains")} placeholder="Collecting school fees on time is a recurring nightmare…" />
          </Field>
          <Field label="Goals">
            <Textarea rows={3} value={f.goals} onChange={set("goals")} />
          </Field>
          <Field label="Objections">
            <Textarea rows={3} value={f.objections} onChange={set("objections")} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={pending}
            onClick={async () => {
              const ok = await exec(() => saveIcp(icp?.id ?? null, { ...f, titles: split(f.titles), pains: split(f.pains), goals: split(f.goals), objections: split(f.objections) }));
              if (ok) onOpenChange(false);
            }}
          >
            Save ICP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OfferDialog({ open, onOpenChange, offer }: { open: boolean; onOpenChange: (v: boolean) => void; offer?: Offer }) {
  const { exec, pending } = useAction();
  const [f, setF] = useState({ name: offer?.name ?? "", pricing: offer?.pricing ?? "", valueProp: offer?.valueProp ?? "", proof: offer?.proof ?? "", cta: offer?.cta ?? "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={offer ? "Edit offer" : "New offer"} size="lg">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <Input value={f.name} onChange={set("name")} placeholder="Done-For-You School OS" />
          </Field>
          <Field label="Pricing">
            <Input value={f.pricing} onChange={set("pricing")} placeholder="$3,500/month" />
          </Field>
          <Field label="Value proposition" className="sm:col-span-2">
            <Textarea rows={3} value={f.valueProp} onChange={set("valueProp")} placeholder="We build… so you…" />
          </Field>
          <Field label="Proof" className="sm:col-span-2">
            <Input value={f.proof} onChange={set("proof")} placeholder="40+ schools onboarded" />
          </Field>
          <Field label="Call to action" className="sm:col-span-2">
            <Input value={f.cta} onChange={set("cta")} placeholder="Book a call" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={pending} onClick={async () => (await exec(() => saveOffer(offer?.id ?? null, f))) && onOpenChange(false)}>
            Save offer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function IcpDialogButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> New ICP
      </Button>
      {open && <IcpDialog open onOpenChange={setOpen} />}
    </>
  );
}

export function OfferDialogButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> New Offer
      </Button>
      {open && <OfferDialog open onOpenChange={setOpen} />}
    </>
  );
}

export function PlaybookMenu({ kind, item }: { kind: "icp" | "offer"; item: Icp | Offer }) {
  const { exec } = useAction();
  const [edit, setEdit] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => setEdit(true)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => exec(() => duplicatePlaybookItem(kind, item.id))}>
            <Copy /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <Confirm
            title={`Delete “${item.name}”?`}
            description="This can’t be undone."
            confirmLabel="Delete"
            onConfirm={async () => {
              await exec(() => deletePlaybookItem(kind, item.id));
            }}
            trigger={
              <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
      {edit && (kind === "icp" ? <IcpDialog open onOpenChange={setEdit} icp={item as Icp} /> : <OfferDialog open onOpenChange={setEdit} offer={item as Offer} />)}
    </>
  );
}
