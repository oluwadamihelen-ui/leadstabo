import type { Metadata } from "next";
import Link from "next/link";
import { Download, Search, Upload } from "lucide-react";
import { requireWorkspace } from "@/lib/auth/guard";
import { LEADS_PAGE_SIZE, listAndCampaignOptions, queryLeads } from "@/lib/queries/leads";
import { LeadgenNav } from "@/components/section-nav";
import { LeadsTable } from "@/components/leads/leads-table";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { NewLeadButton } from "./new-lead";

export const metadata: Metadata = { title: "All Leads" };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireWorkspace();
  const p = await searchParams;
  const [{ rows, total, page }, { lists, campaigns }] = await Promise.all([queryLeads(ctx.workspaceId, p), listAndCampaignOptions(ctx.workspaceId)]);
  const canEdit = ctx.role !== "VIEWER";
  return (
    <>
      <LeadgenNav active="/leads" />
      <PageHeader
        title="All Leads"
        description="Every lead saved in your workspace, across lists and campaigns."
        actions={
          <>
            <Button variant="secondary" asChild>
              <a href="/api/export/leads">
                <Download /> Export all
              </a>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/leadgen/verify#import">
                <Upload /> Import CSV
              </Link>
            </Button>
            {canEdit && <NewLeadButton lists={lists} />}
            <Button asChild>
              <Link href="/leadgen/find">
                <Search /> Find leads
              </Link>
            </Button>
          </>
        }
      />
      <LeadsTable rows={rows} total={total} page={page} pageSize={LEADS_PAGE_SIZE} lists={lists} campaigns={campaigns} canEdit={canEdit} />
    </>
  );
}
