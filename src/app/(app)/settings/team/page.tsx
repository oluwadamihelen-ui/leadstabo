import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { hasRole, PERMISSIONS, ROLE_DESCRIPTIONS } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate, timeAgo } from "@/lib/utils";
import { InviteButton, MemberRoleSelect, RemoveMemberButton, RevokeInviteButton } from "./team-client";

export const metadata: Metadata = { title: "Team" };

const ROLES = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;

export default async function TeamPage() {
  const ctx = await requireWorkspace();
  const [members, invites, sub] = await Promise.all([
    db.workspaceMember.findMany({ where: { workspaceId: ctx.workspaceId }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    db.teamInvitation.findMany({ where: { workspaceId: ctx.workspaceId, status: "PENDING", expiresAt: { gt: new Date() } }, include: { invitedBy: true }, orderBy: { createdAt: "desc" } }),
    db.subscription.findUnique({ where: { workspaceId: ctx.workspaceId }, include: { plan: true } }),
  ]);
  const isAdmin = hasRole(ctx.role, "ADMIN");
  const seats = sub?.plan.teamMembers ?? 1;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              {members.length + invites.length} of {seats} seats used on the {sub?.plan.name ?? "current"} plan
            </CardDescription>
          </div>
          {isAdmin && <InviteButton />}
        </CardHeader>
        <Table>
          <THead>
            <tr>
              <TH>Member</TH>
              <TH>Role</TH>
              <TH>Joined</TH>
              <TH className="w-10" />
            </tr>
          </THead>
          <TBody>
            {members.map((m) => (
              <TR key={m.id}>
                <TD>
                  <div className="flex items-center gap-3">
                    <Avatar name={m.user.name} src={m.user.avatarUrl} />
                    <div>
                      <p className="font-medium">
                        {m.user.name} {m.userId === ctx.user.id && <span className="text-xs text-muted-foreground">(you)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{m.user.email}</p>
                    </div>
                  </div>
                </TD>
                <TD>{isAdmin && m.userId !== ctx.user.id ? <MemberRoleSelect id={m.id} role={m.role} canOwner={ctx.role === "OWNER"} /> : <Badge tone={m.role === "OWNER" ? "primary" : "neutral"}>{m.role.toLowerCase()}</Badge>}</TD>
                <TD className="text-muted-foreground">{formatDate(m.createdAt)}</TD>
                <TD>{isAdmin && m.userId !== ctx.user.id && m.role !== "OWNER" && <RemoveMemberButton id={m.id} name={m.user.name} />}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Pending invitations</CardTitle>
            <CardDescription>Invitations expire after 7 days.</CardDescription>
          </div>
        </CardHeader>
        {invites.length === 0 ? (
          <CardContent>
            <p className="text-[13px] text-muted-foreground">No pending invitations.</p>
          </CardContent>
        ) : (
          <div className="divide-y border-t">
            {invites.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-[13px] font-medium">{i.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited as {i.role.toLowerCase()} by {i.invitedBy.name} · {timeAgo(i.createdAt)}
                  </p>
                </div>
                {isAdmin && <RevokeInviteButton id={i.id} />}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Roles & permissions</CardTitle>
            <CardDescription>What each role can do in this workspace.</CardDescription>
          </div>
        </CardHeader>
        <Table>
          <THead>
            <tr>
              <TH>Permission</TH>
              {ROLES.map((r) => (
                <TH key={r} className="text-center">
                  {r.toLowerCase()}
                </TH>
              ))}
            </tr>
          </THead>
          <TBody>
            {PERMISSIONS.map((p) => (
              <TR key={p.label}>
                <TD>{p.label}</TD>
                {ROLES.map((r) => (
                  <TD key={r} className="text-center">
                    {hasRole(r, p.min) ? <Check className="mx-auto size-4 text-success" /> : <Minus className="mx-auto size-4 text-muted-foreground/40" />}
                  </TD>
                ))}
              </TR>
            ))}
          </TBody>
        </Table>
        <CardContent className="grid gap-2 pt-4 sm:grid-cols-2">
          {ROLES.map((r) => (
            <p key={r} className="text-xs text-muted-foreground">
              <span className="font-medium capitalize text-foreground">{r.toLowerCase()}:</span> {ROLE_DESCRIPTIONS[r]}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
