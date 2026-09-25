import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, CircleDashed, X } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { hasRole } from "@/lib/auth/permissions";
import { HealthScore, StatusBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatNumber, timeAgo } from "@/lib/utils";
import { CopyValue, DomainRowActions, VerifyDnsButton } from "../domains-client";

export const metadata: Metadata = { title: "Domain setup" };

const STEPS = [
  { kind: "ENTER", title: "Enter domain", desc: "Domain added to your workspace." },
  { kind: "OWNERSHIP", title: "Verify DNS", desc: "Prove you own the domain with a TXT record." },
  { kind: "SPF", title: "Configure SPF", desc: "Authorise Leadstabo and your mail provider to send." },
  { kind: "DKIM", title: "Configure DKIM", desc: "Cryptographically sign every email." },
  { kind: "DMARC", title: "Configure DMARC", desc: "Tell receivers how to handle failures and get reports." },
  { kind: "INBOXES", title: "Add inboxes", desc: "Connect 2–3 mailboxes on this domain." },
];

export default async function DomainDetail({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireWorkspace();
  const { id } = await params;
  const d = await db.sendingDomain.findFirst({ where: { id, workspaceId: ctx.workspaceId }, include: { records: true, inboxes: { include: { warmup: true } } } });
  if (!d) notFound();
  const isAdmin = hasRole(ctx.role, "ADMIN");
  const rec = (k: string) => d.records.find((r) => r.kind === k);
  const state = (k: string) => (k === "ENTER" ? "VALID" : k === "INBOXES" ? (d.inboxes.length ? "VALID" : "PENDING") : (rec(k)?.status ?? "PENDING"));
  const Icon = ({ s }: { s: string }) =>
    s === "VALID" ? <Check className="size-3.5" /> : s === "INVALID" ? <X className="size-3.5" /> : <CircleDashed className="size-3.5" />;

  return (
    <div className="space-y-6">
      <Link href="/settings/infrastructure/domains" className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Sending domains
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight">{d.domain}</h2>
            <StatusBadge status={d.status} />
          </div>
          <p className="mt-1 flex items-center gap-3 text-[13px] text-muted-foreground">
            <span className="flex items-center gap-1">
              Health <HealthScore score={d.healthScore} />
            </span>
            <span>Reputation: {d.reputation}</span>
            <span>{formatNumber(d.dailyCapacity)}/day capacity</span>
            <span>Checked {d.lastCheckedAt ? timeAgo(d.lastCheckedAt) : "never"}</span>
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <VerifyDnsButton id={d.id} />
            <DomainRowActions id={d.id} domain={d.domain} afterDelete="/settings/infrastructure/domains" />
          </div>
        )}
      </div>

      <Card className="p-5">
        <ol className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {STEPS.map((s, i) => {
            const st = state(s.kind);
            return (
              <li key={s.kind} className="flex gap-2.5">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                    st === "VALID" && "border-success bg-success/15 text-success",
                    st === "INVALID" && "border-destructive bg-destructive/15 text-destructive",
                    st === "PENDING" && "text-muted-foreground",
                  )}
                >
                  {st === "PENDING" ? i + 1 : <Icon s={st} />}
                </span>
                <div>
                  <p className="text-[13px] font-medium">{s.title}</p>
                  <p className="text-[11px] leading-4 text-muted-foreground">{s.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>DNS records</CardTitle>
            <CardDescription>Add these at your DNS provider (Cloudflare, GoDaddy, Namecheap…), then click Verify DNS. Propagation can take up to an hour.</CardDescription>
          </div>
        </CardHeader>
        <div className="divide-y border-t">
          {["OWNERSHIP", "SPF", "DKIM", "DMARC", "MX"].map((k) => {
            const r = rec(k);
            if (!r) return null;
            return (
              <div key={k} className="grid gap-3 px-5 py-4 md:grid-cols-[140px_70px_1fr_1fr_110px] md:items-center">
                <p className="text-[13px] font-medium">{k === "OWNERSHIP" ? "Ownership" : k}</p>
                <span className="w-fit rounded border px-1.5 py-0.5 font-mono text-[11px]">{r.recordType}</span>
                <div className="min-w-0">
                  <p className="label-caps mb-0.5 md:hidden">Host</p>
                  <CopyValue value={r.host} />
                </div>
                <div className="min-w-0">
                  <p className="label-caps mb-0.5 md:hidden">Value</p>
                  <CopyValue value={r.expectedValue} />
                </div>
                <StatusBadge status={r.status} />
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Inboxes on this domain</CardTitle>
            <CardDescription>Recommended: 2–3 inboxes per domain, 30–40 emails/day each.</CardDescription>
          </div>
          {isAdmin && (
            <Button asChild variant="secondary" size="sm">
              <Link href="/settings/infrastructure/inboxes">Add inbox</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {d.inboxes.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No inboxes yet.</p>
          ) : (
            <div className="space-y-2">
              {d.inboxes.map((i) => (
                <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-[13px]">
                  <span className="font-medium">{i.email}</span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    <StatusBadge status={i.status} /> Warmup <StatusBadge status={i.warmup?.status ?? "NOT_STARTED"} /> {i.dailyLimit}/day
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
