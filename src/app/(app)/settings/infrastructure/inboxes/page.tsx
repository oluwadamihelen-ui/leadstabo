import type { Metadata } from "next";
import { Inbox as InboxIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { hasRole } from "@/lib/auth/permissions";
import { inboxFunnels } from "@/lib/services/analytics";
import { HealthScore, StatusBadge } from "@/components/status";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Progress } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";
import { AddInboxButton, InboxActions } from "./inboxes-client";

export const metadata: Metadata = { title: "Sending Inboxes" };

const PROVIDER: Record<string, string> = { GOOGLE: "Google Workspace", MICROSOFT: "Microsoft 365", SMTP: "SMTP/IMAP", OTHER: "SMTP/IMAP" };

export default async function InboxesPage() {
  const ctx = await requireWorkspace();
  const [inboxes, sub, funnels] = await Promise.all([
    db.inbox.findMany({ where: { workspaceId: ctx.workspaceId }, include: { domain: true, warmup: true }, orderBy: { createdAt: "asc" } }),
    db.subscription.findUnique({ where: { workspaceId: ctx.workspaceId }, include: { plan: true } }),
    inboxFunnels(ctx.workspaceId),
  ]);
  const isAdmin = hasRole(ctx.role, "ADMIN");
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>Sending Inboxes</CardTitle>
          <CardDescription>
            {inboxes.length} of {sub?.plan.inboxLimit ?? "∞"} inboxes · sends over SMTP, syncs replies & bounces over IMAP. Credentials are encrypted at rest.
          </CardDescription>
        </div>
        {isAdmin && <AddInboxButton />}
      </CardHeader>
      {inboxes.length === 0 ? (
        <EmptyState icon={InboxIcon} title="No inboxes connected" description="Connect Google Workspace, Microsoft 365 or any SMTP mailbox." action={isAdmin && <AddInboxButton />} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Inbox</TH>
              <TH>Domain</TH>
              <TH>Status</TH>
              <TH>Warmup</TH>
              <TH>Sent today</TH>
              <TH className="text-right">Total sent</TH>
              <TH className="text-right">Bounce</TH>
              <TH>Health</TH>
              <TH className="w-10" />
            </tr>
          </THead>
          <TBody>
            {inboxes.map((i) => (
              <TR key={i.id}>
                <TD>
                  <p className="font-medium">{i.email}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {i.displayName} · {PROVIDER[i.provider]}
                    {!i.encryptedCredentials && " · demo (no credentials)"}
                  </p>
                  {i.lastError && <p className="mt-0.5 max-w-[260px] text-[11px] text-destructive">{i.lastError}</p>}
                  {i.lastSyncedAt && !i.lastError && <p className="text-[11px] text-muted-foreground">Replies synced {formatDateTime(i.lastSyncedAt)}</p>}
                </TD>
                <TD className="text-muted-foreground">{i.domain?.domain ?? "—"}</TD>
                <TD>
                  <StatusBadge status={i.status} />
                </TD>
                <TD>
                  <StatusBadge status={i.warmup?.status ?? "NOT_STARTED"} />
                </TD>
                <TD className="w-36">
                  <p className="text-xs tabular-nums">
                    {i.sentToday} / {i.dailyLimit}
                  </p>
                  <Progress value={(i.sentToday / Math.max(1, i.dailyLimit)) * 100} className="mt-1" />
                </TD>
                <TD className="text-right tabular-nums">{formatNumber(funnels(i.id).sent)}</TD>
                <TD className={cn("text-right tabular-nums", i.bounceRate > 3 ? "text-destructive" : i.bounceRate > 2 ? "text-warning" : "")}>{i.bounceRate.toFixed(1)}%</TD>
                <TD>
                  <HealthScore score={i.healthScore} />
                </TD>
                <TD>{isAdmin && <InboxActions inbox={{ id: i.id, email: i.email, displayName: i.displayName, dailyLimit: i.dailyLimit, signature: i.signature ?? "", status: i.status }} />}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}
