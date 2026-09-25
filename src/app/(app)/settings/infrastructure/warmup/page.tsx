import type { Metadata } from "next";
import { Flame } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { hasRole } from "@/lib/auth/permissions";
import { StatCard } from "@/components/stat-card";
import { HealthScore, StatusBadge } from "@/components/status";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Progress } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { WarmupActions } from "./warmup-client";

export const metadata: Metadata = { title: "Warmup" };

export default async function WarmupPage() {
  const ctx = await requireWorkspace();
  const inboxes = await db.inbox.findMany({ where: { workspaceId: ctx.workspaceId }, include: { warmup: true }, orderBy: { createdAt: "asc" } });
  const isAdmin = hasRole(ctx.role, "ADMIN");
  const active = inboxes.filter((i) => i.warmup?.status === "ACTIVE");
  const done = inboxes.filter((i) => i.warmup?.status === "COMPLETED");
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Warming" value={active.length} icon={Flame} hint="Inboxes ramping up" />
        <StatCard label="Ready" value={done.length} hint="Warmup complete" />
        <StatCard label="Warmup emails/day" value={inboxes.reduce((a, i) => a + (i.warmup?.status === "ACTIVE" ? i.warmup.currentPerDay : 0), 0)} />
        <StatCard label="Avg warmup health" value={avg(inboxes.filter((i) => i.warmup && i.warmup.healthScore > 0).map((i) => i.warmup!.healthScore))} />
      </div>
      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>Warmup</CardTitle>
            <CardDescription>Gradually builds sender reputation by exchanging real, engaged emails. Warm for 14–21 days before cold sending.</CardDescription>
          </div>
        </CardHeader>
        {inboxes.length === 0 ? (
          <EmptyState icon={Flame} title="No inboxes to warm" description="Connect an inbox first." />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Inbox</TH>
                <TH>Status</TH>
                <TH className="text-right">Days active</TH>
                <TH>Emails / day</TH>
                <TH className="text-right">Reply rate</TH>
                <TH>Health</TH>
                <TH>Progress</TH>
                <TH className="w-10" />
              </tr>
            </THead>
            <TBody>
              {inboxes.map((i) => {
                const w = i.warmup;
                const progress = w ? Math.min(100, Math.round((w.currentPerDay / Math.max(1, w.targetPerDay)) * 60 + Math.min(w.daysActive, 21) * (40 / 21))) : 0;
                return (
                  <TR key={i.id}>
                    <TD className="font-medium">{i.email}</TD>
                    <TD>
                      <StatusBadge status={w?.status ?? "NOT_STARTED"} />
                    </TD>
                    <TD className="text-right tabular-nums">{w?.daysActive ?? 0}</TD>
                    <TD className="tabular-nums">
                      {w?.currentPerDay ?? 0} <span className="text-muted-foreground">/ {w?.targetPerDay ?? 40} target</span>
                    </TD>
                    <TD className="text-right tabular-nums">{w?.replyRate ?? 0}%</TD>
                    <TD>
                      <HealthScore score={w?.healthScore ?? 0} />
                    </TD>
                    <TD className="w-40">
                      <div className="flex items-center gap-2">
                        <Progress value={w?.status === "COMPLETED" ? 100 : progress} tone={w?.status === "COMPLETED" ? "success" : "primary"} />
                        <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{w?.status === "COMPLETED" ? 100 : progress}%</span>
                      </div>
                    </TD>
                    <TD>{isAdmin && w && <WarmupActions inboxId={i.id} status={w.status} targetPerDay={w.targetPerDay} rampIncrement={w.rampIncrement} />}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
