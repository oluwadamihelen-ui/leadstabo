"use client";
import { useState } from "react";
import { Copy, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { useAction } from "@/components/hooks/use-action";
import { changeMemberRole, inviteMember, removeMember, revokeInvitation } from "@/server/actions/settings";

export function InviteButton() {
  const { exec, pending } = useAction();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("MEMBER");
  const [link, setLink] = useState<string | null>(null);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus /> Invite member
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setLink(null);
            setEmail("");
          }
        }}
      >
        <DialogContent title="Invite a teammate" description="They’ll join this workspace with the role you choose." size="sm">
          {link ? (
            <div className="space-y-3">
              <p className="text-[13px] text-muted-foreground">Share this invitation link with {email}. It expires in 7 days.</p>
              <div className="flex gap-2">
                <Input readOnly value={link} className="font-mono text-xs" />
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(link);
                    toast.success("Link copied");
                  }}
                  aria-label="Copy link"
                >
                  <Copy />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Field label="Email">
                <Input type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" />
              </Field>
              <Field label="Role">
                <NativeSelect value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  <option value="ADMIN">Admin — manage team & infrastructure</option>
                  <option value="MEMBER">Member — build & run campaigns</option>
                  <option value="VIEWER">Viewer — read-only</option>
                </NativeSelect>
              </Field>
            </div>
          )}
          <DialogFooter>
            {link ? (
              <Button onClick={() => setOpen(false)}>Done</Button>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  loading={pending}
                  disabled={!email}
                  onClick={async () => {
                    const r = await exec(() => inviteMember({ email, role }));
                    if (r && typeof r === "object" && "link" in r) setLink((r as { link: string }).link);
                  }}
                >
                  Send invitation
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function MemberRoleSelect({ id, role, canOwner }: { id: string; role: Role; canOwner: boolean }) {
  const { exec } = useAction();
  return (
    <NativeSelect className="h-8 w-32 text-xs" value={role} disabled={role === "OWNER" && !canOwner} onChange={(e) => exec(() => changeMemberRole(id, e.target.value as Role))}>
      {canOwner && <option value="OWNER">Owner</option>}
      {!canOwner && role === "OWNER" && <option value="OWNER">Owner</option>}
      <option value="ADMIN">Admin</option>
      <option value="MEMBER">Member</option>
      <option value="VIEWER">Viewer</option>
    </NativeSelect>
  );
}

export function RemoveMemberButton({ id, name }: { id: string; name: string }) {
  const { exec } = useAction();
  return (
    <Confirm
      title={`Remove ${name}?`}
      description="They’ll lose access to this workspace immediately."
      confirmLabel="Remove"
      onConfirm={async () => {
        await exec(() => removeMember(id));
      }}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Remove ${name}`}>
          <X />
        </Button>
      }
    />
  );
}

export function RevokeInviteButton({ id }: { id: string }) {
  const { exec } = useAction();
  return (
    <Button variant="ghost" size="sm" onClick={() => exec(() => revokeInvitation(id))}>
      Revoke
    </Button>
  );
}
