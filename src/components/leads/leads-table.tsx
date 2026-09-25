"use client";
import { TimeAgo } from "@/components/time";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  ListMinus,
  ListPlus,
  MailCheck,
  MoreHorizontal,
  Rocket,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, NativeSelect } from "@/components/ui/input";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { Confirm } from "@/components/ui/confirm";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatusBadge } from "@/components/status";
import { useAction } from "@/components/hooks/use-action";
import { addLeadsToList, deleteLeads, removeLeadsFromList, verifyLeads } from "@/server/actions/leads";
import { addLeadsToCampaign } from "@/server/actions/campaigns";
import { cn, formatNumber } from "@/lib/utils";
import { AddToListDialog } from "./add-to-list-dialog";

export interface LeadRow {
  id: string;
  name: string;
  email: string;
  emailStatus: string;
  title: string | null;
  company: string | null;
  industry: string | null;
  location: string | null;
  linkedinUrl: string | null;
  size: string | null;
  lastContactedAt: string | null;
  createdAt: string;
}

const SORTS = [
  ["createdAt", "Added"],
  ["firstName", "Name"],
  ["title", "Job title"],
  ["emailStatus", "Status"],
  ["lastContactedAt", "Last contacted"],
] as const;

export function LeadsTable({
  rows,
  total,
  page,
  pageSize,
  lists,
  campaigns,
  listId,
  canEdit,
}: {
  rows: LeadRow[];
  total: number;
  page: number;
  pageSize: number;
  lists: { id: string; name: string }[];
  campaigns: { id: string; name: string; status: string }[];
  listId?: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [nav, startNav] = useTransition();
  const { exec, pending } = useAction();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState(params.get("q") ?? "");
  const [listDialog, setListDialog] = useState<string[] | null>(null);
  const [campaignDialog, setCampaignDialog] = useState<string[] | null>(null);

  function update(next: Record<string, string | null>, keepPage = false) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    if (!keepPage) sp.delete("page");
    setSelected(new Set());
    startNav(() => router.push(`${pathname}?${sp}`));
  }
  const sort = params.get("sort") ?? "createdAt";
  const dir = params.get("dir") ?? "desc";
  const sel = Array.from(selected);
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const sortHeader = (key: string, label: string, className?: string) => (
    <TH className={className}>
      <button className="inline-flex items-center gap-1 uppercase hover:text-foreground" onClick={() => update({ sort: key, dir: sort === key && dir === "desc" ? "asc" : "desc" })}>
        {label}
        {sort === key && (dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </TH>
  );

  const actions = (ids: string[]) => (
    <>
      <Button size="sm" onClick={() => setListDialog(ids)}>
        <ListPlus /> Add to list
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setCampaignDialog(ids)}>
        <Rocket /> Add to campaign
      </Button>
      <Button size="sm" variant="secondary" loading={pending} onClick={() => exec(() => verifyLeads({ leadIds: ids })).then(() => setSelected(new Set()))}>
        <MailCheck /> Verify
      </Button>
      <Button size="sm" variant="secondary" asChild>
        <a href={`/api/export/leads?ids=${ids.join(",")}`}>
          <Download /> Export
        </a>
      </Button>
      {listId && (
        <Button size="sm" variant="secondary" onClick={() => exec(() => removeLeadsFromList(listId, ids)).then(() => setSelected(new Set()))}>
          <ListMinus /> Remove from list
        </Button>
      )}
      <Confirm
        title={`Delete ${ids.length} lead${ids.length === 1 ? "" : "s"}?`}
        description="They’ll be removed from every list and campaign. This can’t be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          await exec(() => deleteLeads(ids));
          setSelected(new Set());
        }}
        trigger={
          <Button size="sm" variant="ghost" className="text-destructive">
            <Trash2 /> Delete
          </Button>
        }
      />
    </>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <form
          className="relative w-full sm:w-72"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: q.trim() || null });
          }}
        >
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, company…" className="pl-8" />
        </form>
        <NativeSelect className="w-auto" value={params.get("status") ?? ""} onChange={(e) => update({ status: e.target.value || null })} aria-label="Email status">
          <option value="">All statuses</option>
          {["VALID", "CATCH_ALL", "RISKY", "INVALID", "UNKNOWN", "UNVERIFIED"].map((s) => (
            <option key={s} value={s}>
              {s === "CATCH_ALL" ? "Catch-all" : s[0] + s.slice(1).toLowerCase()}
            </option>
          ))}
        </NativeSelect>
        {!listId && (
          <NativeSelect className="w-auto max-w-[200px]" value={params.get("list") ?? ""} onChange={(e) => update({ list: e.target.value || null })} aria-label="List">
            <option value="">All lists</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </NativeSelect>
        )}
        <NativeSelect className="w-auto" value={sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort by">
          {SORTS.map(([k, l]) => (
            <option key={k} value={k}>
              Sort: {l}
            </option>
          ))}
        </NativeSelect>
        <span className="ml-auto text-[13px] text-muted-foreground">{formatNumber(total)} leads</span>
      </div>

      {selected.size > 0 && canEdit && (
        <div className="sticky top-16 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-card px-3 py-2 shadow-lg animate-fade-in">
          <span className="text-[13px] font-medium">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {actions(sel)}
            <Button size="icon-sm" variant="ghost" onClick={() => setSelected(new Set())} aria-label="Clear selection">
              <X />
            </Button>
          </div>
        </div>
      )}

      <div className={cn("overflow-hidden rounded-xl border bg-card", nav && "opacity-60")}>
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No leads here yet"
            description="Find leads in the database, import a CSV, or add a lead manually."
            action={
              <Button asChild>
                <Link href="/leadgen/find">Find leads</Link>
              </Button>
            }
          />
        ) : (
          <>
            <Table className="hidden md:table">
              <THead>
                <tr>
                  <TH className="w-10">
                    <Checkbox
                      checked={allSelected ? true : selected.size ? "indeterminate" : false}
                      onCheckedChange={(v) => setSelected(v ? new Set(rows.map((r) => r.id)) : new Set())}
                      aria-label="Select all"
                    />
                  </TH>
                  {sortHeader("firstName", "Name")}
                  {sortHeader("title", "Job title")}
                  <TH>Company</TH>
                  <TH>Industry</TH>
                  <TH>Location</TH>
                  <TH>Email</TH>
                  {sortHeader("emailStatus", "Status")}
                  {sortHeader("lastContactedAt", "Last contacted")}
                  <TH className="w-10" />
                </tr>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id} data-state={selected.has(r.id) ? "selected" : undefined}>
                    <TD>
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={(v) => {
                          const n = new Set(selected);
                          if (v) n.add(r.id);
                          else n.delete(r.id);
                          setSelected(n);
                        }}
                        aria-label={`Select ${r.name}`}
                      />
                    </TD>
                    <TD>
                      <Link href={`/leads/${r.id}`} className="flex items-center gap-2.5 whitespace-nowrap font-medium hover:text-primary">
                        <Avatar name={r.name} className="size-7" />
                        {r.name}
                      </Link>
                    </TD>
                    <TD className="max-w-[200px] truncate">{r.title ?? "—"}</TD>
                    <TD className="whitespace-nowrap">{r.company ?? "—"}</TD>
                    <TD className="whitespace-nowrap text-muted-foreground">{r.industry ?? "—"}</TD>
                    <TD className="whitespace-nowrap">{r.location ?? "—"}</TD>
                    <TD className="font-mono text-xs">{r.email}</TD>
                    <TD>
                      <StatusBadge status={r.emailStatus} />
                    </TD>
                    <TD className="whitespace-nowrap text-muted-foreground">{r.lastContactedAt ? <TimeAgo date={r.lastContactedAt} /> : "Never"}</TD>
                    <TD>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${r.name}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => router.push(`/leads/${r.id}`)}>
                            <Eye /> View lead
                          </DropdownMenuItem>
                          {canEdit && (
                            <>
                              <DropdownMenuItem onSelect={() => setListDialog([r.id])}>
                                <ListPlus /> Add to list
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setCampaignDialog([r.id])}>
                                <Rocket /> Add to campaign
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => exec(() => verifyLeads({ leadIds: [r.id] }))}>
                                <MailCheck /> Verify email
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => (window.location.href = `/api/export/leads?ids=${r.id}`)}>
                                <Download /> Export
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {listId && (
                                <DropdownMenuItem onSelect={() => exec(() => removeLeadsFromList(listId, [r.id]))}>
                                  <ListMinus /> Remove from list
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem destructive onSelect={() => exec(() => deleteLeads([r.id]))}>
                                <Trash2 /> Delete lead
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            {/* Mobile: cards */}
            <div className="divide-y md:hidden">
              {rows.map((r) => (
                <div key={r.id} className="flex items-start gap-3 p-3">
                  <Checkbox
                    className="mt-1"
                    checked={selected.has(r.id)}
                    onCheckedChange={(v) => {
                      const n = new Set(selected);
                      if (v) n.add(r.id);
                      else n.delete(r.id);
                      setSelected(n);
                    }}
                  />
                  <Link href={`/leads/${r.id}`} className="min-w-0 flex-1">
                    <p className="font-medium">{r.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.title} · {r.company}
                    </p>
                    <p className="mt-1 truncate font-mono text-xs">{r.email}</p>
                  </Link>
                  <StatusBadge status={r.emailStatus} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-[13px] text-muted-foreground">
        <span>
          Page {page} of {pages}
        </span>
        <div className="flex gap-1.5">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => update({ page: String(page - 1) }, true)}>
            <ChevronLeft /> Prev
          </Button>
          <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => update({ page: String(page + 1) }, true)}>
            Next <ChevronRight />
          </Button>
        </div>
      </div>

      {listDialog && (
        <AddToListDialog
          open
          onOpenChange={(v) => !v && setListDialog(null)}
          lists={lists.filter((l) => l.id !== listId)}
          count={listDialog.length}
          onSubmit={async (t) => {
            const ok = await exec(() => addLeadsToList({ leadIds: listDialog, ...t }));
            if (ok) setSelected(new Set());
            return ok;
          }}
        />
      )}
      {campaignDialog && (
        <AddToCampaignDialog
          campaigns={campaigns}
          count={campaignDialog.length}
          onClose={() => setCampaignDialog(null)}
          onSubmit={async (campaignId) => {
            const ok = await exec(() => addLeadsToCampaign({ campaignId, leadIds: campaignDialog }));
            if (ok) setSelected(new Set());
            return ok;
          }}
        />
      )}
    </div>
  );
}

export function AddToCampaignDialog({
  campaigns,
  count,
  onClose,
  onSubmit,
}: {
  campaigns: { id: string; name: string; status: string }[];
  count: number;
  onClose: () => void;
  onSubmit: (campaignId: string) => Promise<unknown>;
}) {
  const eligible = campaigns.filter((c) => c.status !== "COMPLETED");
  const [id, setId] = useState(eligible[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent title={`Add ${count} lead${count === 1 ? "" : "s"} to a campaign`} description="Only verified (valid or catch-all) emails are eligible to receive campaign emails." size="sm">
        {eligible.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            No open campaigns.{" "}
            <Link href="/outreach/campaigns/new" className="text-primary hover:underline">
              Create one
            </Link>
            .
          </p>
        ) : (
          <Field label="Campaign">
            <NativeSelect value={id} onChange={(e) => setId(e.target.value)}>
              {eligible.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status.toLowerCase()})
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!id}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const ok = await onSubmit(id);
              setBusy(false);
              if (ok) onClose();
            }}
          >
            Add to campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
