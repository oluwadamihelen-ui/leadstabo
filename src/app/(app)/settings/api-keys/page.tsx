import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { hasRole } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate, timeAgo } from "@/lib/utils";
import { CreateKeyButton, RevokeKeyButton } from "./keys-client";

export const metadata: Metadata = { title: "API Keys" };

export default async function ApiKeysPage() {
  const ctx = await requireWorkspace();
  const keys = await db.apiKey.findMany({ where: { workspaceId: ctx.workspaceId }, include: { createdBy: true }, orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }] });
  const isAdmin = hasRole(ctx.role, "ADMIN");
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>API keys</CardTitle>
            <CardDescription>Use keys to access the Leadstabo REST API. Keys are shown once and stored hashed.</CardDescription>
          </div>
          {isAdmin && <CreateKeyButton />}
        </CardHeader>
        {keys.length === 0 ? (
          <EmptyState icon={KeyRound} title="No API keys" description="Create a key to connect Zapier, your CRM or custom scripts." />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Name</TH>
                <TH>Key</TH>
                <TH>Created</TH>
                <TH>Last used</TH>
                <TH>Status</TH>
                <TH className="w-10" />
              </tr>
            </THead>
            <TBody>
              {keys.map((k) => (
                <TR key={k.id}>
                  <TD>
                    <p className="font-medium">{k.name}</p>
                    <p className="text-xs text-muted-foreground">by {k.createdBy.name}</p>
                  </TD>
                  <TD className="font-mono text-xs">{k.prefix}••••••••</TD>
                  <TD className="text-muted-foreground">{formatDate(k.createdAt)}</TD>
                  <TD className="text-muted-foreground">{k.lastUsedAt ? timeAgo(k.lastUsedAt) : "Never"}</TD>
                  <TD>{k.revokedAt ? <Badge tone="danger">Revoked</Badge> : <Badge tone="success">Active</Badge>}</TD>
                  <TD>{isAdmin && !k.revokedAt && <RevokeKeyButton id={k.id} name={k.name} />}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Quick start</CardTitle>
            <CardDescription>Authenticate with a bearer token. All endpoints are scoped to this workspace.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-6 scrollbar-thin">{`# List leads
curl ${base}/api/v1/leads?limit=25 \\
  -H "Authorization: Bearer lsk_live_…"

# Create a lead
curl -X POST ${base}/api/v1/leads \\
  -H "Authorization: Bearer lsk_live_…" -H "Content-Type: application/json" \\
  -d '{"email":"ada@acme.com","firstName":"Ada","lastName":"Lovelace","company":"Acme"}'

# List campaigns with stats
curl ${base}/api/v1/campaigns -H "Authorization: Bearer lsk_live_…"`}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
