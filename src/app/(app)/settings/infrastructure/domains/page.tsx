import type { Metadata } from "next";
import Link from "next/link";
import { Globe } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { hasRole } from "@/lib/auth/permissions";
import { HealthScore, StatusBadge } from "@/components/status";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatNumber, timeAgo } from "@/lib/utils";
import { AddDomainButton, DomainRowActions } from "./domains-client";

export const metadata: Metadata = { title: "Sending Domains" };

export default async function DomainsPage() {
  const ctx = await requireWorkspace();
  const domains = await db.sendingDomain.findMany({ where: { workspaceId: ctx.workspaceId }, include: { _count: { select: { inboxes: true } } }, orderBy: { createdAt: "asc" } });
  const isAdmin = hasRole(ctx.role, "ADMIN");
  const capacity = domains.reduce((a, d) => a + d.dailyCapacity, 0);
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>Sending Domains</CardTitle>
          <CardDescription>
            {domains.filter((d) => d.status === "ACTIVE").length} of {domains.length} active · {formatNumber(capacity)} emails/day capacity. Use secondary domains to protect your main brand.
          </CardDescription>
        </div>
        {isAdmin && <AddDomainButton />}
      </CardHeader>
      {domains.length === 0 ? (
        <EmptyState icon={Globe} title="No sending domains" description="Add a domain like getacme.com, then publish the DNS records we generate." action={isAdmin && <AddDomainButton />} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Domain</TH>
              <TH>Status</TH>
              <TH>SPF</TH>
              <TH>DKIM</TH>
              <TH>DMARC</TH>
              <TH>Health</TH>
              <TH className="text-right">Inboxes</TH>
              <TH className="text-right">Capacity/day</TH>
              <TH>Checked</TH>
              <TH className="w-10" />
            </tr>
          </THead>
          <TBody>
            {domains.map((d) => (
              <TR key={d.id}>
                <TD>
                  <Link href={`/settings/infrastructure/domains/${d.id}`} className="font-medium hover:text-primary">
                    {d.domain}
                  </Link>
                  <p className="text-[11px] text-muted-foreground">Reputation: {d.reputation}</p>
                </TD>
                <TD>
                  <StatusBadge status={d.status} />
                </TD>
                <TD>
                  <StatusBadge status={d.spfStatus} />
                </TD>
                <TD>
                  <StatusBadge status={d.dkimStatus} />
                </TD>
                <TD>
                  <StatusBadge status={d.dmarcStatus} />
                </TD>
                <TD>
                  <HealthScore score={d.healthScore} />
                </TD>
                <TD className="text-right tabular-nums">{d._count.inboxes}</TD>
                <TD className="text-right tabular-nums">{formatNumber(d.dailyCapacity)}</TD>
                <TD className="whitespace-nowrap text-muted-foreground">{d.lastCheckedAt ? timeAgo(d.lastCheckedAt) : "Never"}</TD>
                <TD>{isAdmin && <DomainRowActions id={d.id} domain={d.domain} />}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}
