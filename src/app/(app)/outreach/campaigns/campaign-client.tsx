"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Copy, Eye, MoreHorizontal, Pause, Play, Rocket, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Confirm } from "@/components/ui/confirm";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { useAction } from "@/components/hooks/use-action";
import { deleteCampaign, duplicateCampaign, setCampaignStatus } from "@/server/actions/campaigns";

export function CampaignSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(initial);
  return (
    <form
      className="relative w-full md:w-80"
      onSubmit={(e) => {
        e.preventDefault();
        const sp = new URLSearchParams(params.toString());
        if (q.trim()) sp.set("q", q.trim());
        else sp.delete("q");
        router.push(`${pathname}?${sp}`);
      }}
    >
      <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search campaigns…" className="pl-8" />
    </form>
  );
}

export function CampaignMenu({ id, status, afterDelete }: { id: string; status: string; afterDelete?: string }) {
  const router = useRouter();
  const { exec } = useAction();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Campaign actions">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => router.push(`/outreach/campaigns/${id}`)}>
          <Eye /> Open
        </DropdownMenuItem>
        {status === "DRAFT" && (
          <DropdownMenuItem onSelect={() => exec(() => setCampaignStatus(id, "launch"))}>
            <Rocket /> Launch
          </DropdownMenuItem>
        )}
        {status === "ACTIVE" && (
          <DropdownMenuItem onSelect={() => exec(() => setCampaignStatus(id, "pause"))}>
            <Pause /> Pause
          </DropdownMenuItem>
        )}
        {status === "PAUSED" && (
          <DropdownMenuItem onSelect={() => exec(() => setCampaignStatus(id, "resume"))}>
            <Play /> Resume
          </DropdownMenuItem>
        )}
        {(status === "ACTIVE" || status === "PAUSED") && (
          <DropdownMenuItem onSelect={() => exec(() => setCampaignStatus(id, "complete"))}>
            <CheckCircle2 /> Mark complete
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={async () => {
            const r = await exec(() => duplicateCampaign(id));
            if (r && typeof r === "object" && "id" in r) router.push(`/outreach/campaigns/${(r as { id: string }).id}`);
          }}
        >
          <Copy /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <Confirm
          title="Delete this campaign?"
          description="All sent-email analytics for this campaign will be removed. Leads stay in your workspace."
          confirmLabel="Delete campaign"
          onConfirm={async () => {
            const ok = await exec(() => deleteCampaign(id), { refresh: !afterDelete });
            if (ok && afterDelete) router.push(afterDelete);
          }}
          trigger={
            <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
