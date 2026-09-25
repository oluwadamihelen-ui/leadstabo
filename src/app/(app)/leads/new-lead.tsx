"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { useAction } from "@/components/hooks/use-action";
import { createLead } from "@/server/actions/leads";

export function NewLeadButton({ lists, listId }: { lists: { id: string; name: string }[]; listId?: string }) {
  const router = useRouter();
  const { exec, pending } = useAction();
  const [open, setOpen] = useState(false);
  const empty = { firstName: "", lastName: "", email: "", title: "", company: "", phone: "", location: "", linkedinUrl: "", listId: listId ?? "" };
  const [f, setF] = useState(empty);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <UserPlus /> Add lead
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Add a lead" description="New leads start unverified — verify before adding them to a campaign.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name">
              <Input value={f.firstName} onChange={set("firstName")} />
            </Field>
            <Field label="Last name">
              <Input value={f.lastName} onChange={set("lastName")} />
            </Field>
            <Field label="Email" className="sm:col-span-2">
              <Input type="email" value={f.email} onChange={set("email")} placeholder="name@company.com" />
            </Field>
            <Field label="Job title">
              <Input value={f.title} onChange={set("title")} />
            </Field>
            <Field label="Company">
              <Input value={f.company} onChange={set("company")} />
            </Field>
            <Field label="Location">
              <Input value={f.location} onChange={set("location")} />
            </Field>
            <Field label="Phone">
              <Input value={f.phone} onChange={set("phone")} />
            </Field>
            <Field label="LinkedIn URL" className="sm:col-span-2">
              <Input value={f.linkedinUrl} onChange={set("linkedinUrl")} placeholder="https://www.linkedin.com/in/…" />
            </Field>
            {!listId && (
              <Field label="Add to list (optional)" className="sm:col-span-2">
                <NativeSelect value={f.listId} onChange={set("listId")}>
                  <option value="">No list</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              onClick={async () => {
                const res = await exec(() => createLead({ ...f, listId: f.listId || undefined }));
                if (res && typeof res === "object" && "id" in res) {
                  setOpen(false);
                  setF(empty);
                  router.push(`/leads/${(res as { id: string }).id}`);
                }
              }}
            >
              Add lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
