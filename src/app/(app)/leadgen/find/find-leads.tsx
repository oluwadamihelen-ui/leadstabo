"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  ListPlus,
  Loader2,
  MailCheck,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
  EyeOff,

} from "lucide-react";
import { toast } from "sonner";
import { Linkedin } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AddToListDialog } from "@/components/leads/add-to-list-dialog";
import { EmailCell, EmailStatusCell } from "@/components/leads/email-status";
import { useAction } from "@/components/hooks/use-action";
import { addProspectsToList, saveProspectsToLeads, verifyProspects } from "@/server/actions/leads";
import { FILTER_OPTIONS, parseNaturalLanguage } from "@/lib/lead-filters";
import { cn, compactNumber, formatNumber } from "@/lib/utils";

export interface ProspectRow {
  externalId: string;
  leadId: string | null;
  name: string;
  title: string;
  seniority: string;
  department: string;
  company: string;
  domain: string;
  industry: string;
  size: string;
  revenue: string;
  technologies: string[];
  location: string;
  keywords: string[];
  email: string;
  emailStatus: string | null;
  linkedinUrl: string;
}

const QUICK = [
  { label: "Founders & CEOs", params: { sen: "Founder,C-Suite,Owner" } },
  { label: "Sales VPs", params: { dept: "Sales", sen: "VP,Head" } },
  { label: "CTOs in the US", params: { title: "CTO", ctry: "United States" } },
  { label: "Marketing Directors", params: { dept: "Marketing", sen: "Director" } },
  { label: "Agency owners UK", params: { ind: "Marketing & Advertising", ctry: "United Kingdom", sen: "Owner,Founder,C-Suite" } },
  { label: "School owners Nigeria", params: { ind: "Education Management", ctry: "Nigeria" } },
];

export function FindLeads({
  rows,
  total,
  page,
  pageSize,
  lists,
  credits,
  totalContacts,
  canEdit,
}: {
  rows: ProspectRow[];
  total: number;
  page: number;
  pageSize: number;
  lists: { id: string; name: string }[];
  credits: number;
  totalContacts: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [navigating, startNav] = useTransition();
  const { exec, pending } = useAction();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"people" | "companies">("people");
  const [listDialog, setListDialog] = useState<string[] | null>(null);
  const [preview, setPreview] = useState<ProspectRow | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [ai, setAi] = useState("");

  const visible = rows.filter((r) => !hidden.has(r.externalId));
  const cost = (xs: string[]) => rows.filter((r) => xs.includes(r.externalId) && !r.leadId).length;

  function update(next: Record<string, string | null>, resetPage = true) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    if (resetPage) sp.delete("page");
    setSelected(new Set());
    startNav(() => router.push(`${pathname}?${sp.toString()}`));
  }

  const getList = (k: string) => (params.get(k) ?? "").split(",").filter(Boolean);
  function toggleValue(k: string, v: string) {
    const cur = getList(k);
    update({ [k]: (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).join(",") || null });
  }

  const allSelected = visible.length > 0 && visible.every((r) => selected.has(r.externalId));
  const someSelected = visible.some((r) => selected.has(r.externalId));

  async function doVerify(ids: string[]) {
    const c = cost(ids);
    await exec(() => verifyProspects({ externalIds: ids }), {});
    if (c) toast.message(`${c} reveal + ${ids.length} verification credits used`);
    setSelected(new Set());
  }

  async function doExport(ids: string[]) {
    const res = await exec(() => saveProspectsToLeads({ externalIds: ids }));
    if (res && typeof res === "object" && "leadIds" in res) {
      window.location.href = `/api/export/leads?ids=${(res as { leadIds: string[] }).leadIds.join(",")}`;
    }
  }

  const companies = useMemo(() => {
    const m = new Map<string, { name: string; domain: string; industry: string; size: string; revenue: string; location: string; techs: string[]; people: ProspectRow[] }>();
    for (const r of visible) {
      const c = m.get(r.domain) ?? { name: r.company, domain: r.domain, industry: r.industry, size: r.size, revenue: r.revenue, location: r.location, techs: r.technologies, people: [] };
      c.people.push(r);
      m.set(r.domain, c);
    }
    return Array.from(m.values());
  }, [visible]);

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const filterCount = ["ind", "title", "co", "size", "loc", "ctry", "rev", "tech", "kw", "sen", "dept", "deptx"].filter((k) => params.get(k)).length;

  const filterPanel = (
    <aside className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold">Filters</p>
        <div className="flex items-center gap-3 text-xs">
          <span className="font-semibold text-primary">{formatNumber(credits)} cr</span>
          <button className="text-muted-foreground hover:text-foreground" onClick={() => { setQuery(""); startNav(() => router.push(pathname)); }}>
            Clear all
          </button>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: query.trim() || null });
        }}
        className="relative"
      >
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, company, keyword…" className="pl-8" />
      </form>

      <div>
        <p className="label-caps mb-2 flex items-center gap-1.5 text-primary">
          <Sparkles className="size-3.5" /> AI filter
        </p>
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = parseNaturalLanguage(ai);
            if (!Object.keys(parsed).length) return toast.error("Couldn’t map that to filters — try naming an industry, title or country.");
            update({ ind: null, ctry: null, loc: null, sen: null, dept: null, size: null, tech: null, ...parsed });
            toast.success(`Applied ${Object.keys(parsed).length} filter group${Object.keys(parsed).length > 1 ? "s" : ""}`);
          }}
        >
          <Input value={ai} onChange={(e) => setAi(e.target.value)} placeholder="e.g. SaaS founders in the US" className="h-8 text-xs" />
          <Button size="sm" type="submit" disabled={!ai.trim()}>
            Go
          </Button>
        </form>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK.map((q) => (
            <button
              key={q.label}
              onClick={() => update({ ind: null, ctry: null, sen: null, dept: null, title: null, ...q.params })}
              className="rounded-md border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <div>
          <p className="label-caps">Net new only</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Exclude leads already saved</p>
        </div>
        <Switch checked={params.get("net") === "1"} onCheckedChange={(v) => update({ net: v ? "1" : null })} />
      </div>

      <FilterGroup title="Email status" count={params.get("email") === "any" ? 0 : 1} defaultOpen>
        {[
          ["has", "Has email"],
          ["any", "Any"],
        ].map(([v, l]) => (
          <label key={v} className="flex cursor-pointer items-center gap-2 py-1 text-[13px]">
            <input
              type="radio"
              name="email"
              className="accent-[hsl(var(--primary))]"
              checked={(params.get("email") ?? "has") === v}
              onChange={() => update({ email: v === "any" ? "any" : null })}
            />
            {l}
          </label>
        ))}
      </FilterGroup>
      <TextFilter title="Job titles" k="title" placeholder="e.g. Head of Growth" values={getList("title")} onChange={(v) => update({ title: v.join(",") || null })} />
      <CheckFilter title="Management level" k="sen" options={FILTER_OPTIONS.seniorities} values={getList("sen")} onToggle={toggleValue} />
      <DepartmentFilter include={getList("dept")} exclude={getList("deptx")} onChange={(inc, exc) => update({ dept: inc.join(",") || null, deptx: exc.join(",") || null })} />
      <CheckFilter title="Industry" k="ind" options={FILTER_OPTIONS.industries} values={getList("ind")} onToggle={toggleValue} />
      <CheckFilter title="Company size" k="size" options={FILTER_OPTIONS.sizes} values={getList("size")} onToggle={toggleValue} />
      <CheckFilter title="Country" k="ctry" options={FILTER_OPTIONS.countries} values={getList("ctry")} onToggle={toggleValue} />
      <TextFilter title="Location / city" k="loc" placeholder="e.g. Lagos" values={getList("loc")} onChange={(v) => update({ loc: v.join(",") || null })} />
      <TextFilter title="Company" k="co" placeholder="Company name" values={getList("co")} onChange={(v) => update({ co: v.join(",") || null })} />
      <CheckFilter title="Revenue" k="rev" options={FILTER_OPTIONS.revenues} values={getList("rev")} onToggle={toggleValue} />
      <CheckFilter title="Technology" k="tech" options={FILTER_OPTIONS.technologies} values={getList("tech")} onToggle={toggleValue} />
      <TextFilter title="Keywords" k="kw" placeholder="e.g. saas, k12" values={getList("kw")} onChange={(v) => update({ kw: v.join(",") || null })} />
    </aside>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="hidden lg:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border bg-card p-4 scrollbar-thin">{filterPanel}</div>
      </div>
      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogContent title="Filters" size="md">
          {filterPanel}
        </DialogContent>
      </Dialog>

      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h1 className="mr-1 text-xl font-semibold tracking-tight">Discover</h1>
          <span className="text-xs text-muted-foreground">{compactNumber(totalContacts)}+ contacts</span>
          <div className="ml-1 inline-flex h-8 rounded-lg border bg-muted/50 p-0.5 text-[13px]">
            {(["people", "companies"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={cn("flex items-center gap-1.5 rounded-md px-2.5 font-medium capitalize", view === v ? "bg-card shadow-sm" : "text-muted-foreground")}>
                {v === "people" ? <Users className="size-3.5" /> : <Building2 className="size-3.5" />}
                {v}
              </button>
            ))}
          </div>
          <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            {navigating && <Loader2 className="size-3.5 animate-spin" />}
            {formatNumber(total)} {view === "people" ? "people" : "results"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setShowFilters(true)}>
              <SlidersHorizontal /> Filters {filterCount > 0 && <Badge tone="primary">{filterCount}</Badge>}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm">
                  Custom select <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {[10, 25].map((n) => (
                  <DropdownMenuItem key={n} onSelect={() => setSelected(new Set(visible.slice(0, n).map((r) => r.externalId)))}>
                    Select first {n}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onSelect={() => setSelected(new Set(visible.filter((r) => !r.leadId).map((r) => r.externalId)))}>Select unsaved only</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setSelected(new Set())}>Clear selection</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {someSelected && canEdit && (
          <div className="sticky top-16 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-card px-3 py-2 shadow-lg animate-fade-in">
            <span className="text-[13px] font-medium">{selected.size} selected</span>
            <span className="text-xs text-muted-foreground">· {cost(Array.from(selected))} credits to reveal</span>
            <div className="ml-auto flex flex-wrap gap-1.5">
              <Button size="sm" onClick={() => setListDialog(Array.from(selected))}>
                <ListPlus /> Add to list
              </Button>
              <Button size="sm" variant="secondary" loading={pending} onClick={() => doVerify(Array.from(selected))}>
                <MailCheck /> Verify
              </Button>
              <Button size="sm" variant="secondary" onClick={() => doExport(Array.from(selected))}>
                <Download /> Export
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => setSelected(new Set())} aria-label="Clear selection">
                <X />
              </Button>
            </div>
          </div>
        )}

        <div className={cn("overflow-hidden rounded-xl border bg-card transition-opacity", navigating && "opacity-60")}>
          {visible.length === 0 ? (
            <EmptyState icon={Search} title="No leads match these filters" description="Broaden your filters or try the AI filter with a plain-English description of your ICP." />
          ) : view === "people" ? (
            <Table>
              <THead>
                <tr>
                  <TH className="w-10">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={(v) => setSelected(v ? new Set(visible.map((r) => r.externalId)) : new Set())}
                      aria-label="Select all"
                    />
                  </TH>
                  <TH>Name</TH>
                  <TH>Job title</TH>
                  <TH>Company</TH>
                  <TH>Industry</TH>
                  <TH>Location</TH>
                  <TH>Email</TH>
                  <TH>Status</TH>
                  <TH>Size</TH>
                  <TH className="w-10" />
                </tr>
              </THead>
              <TBody>
                {visible.map((r) => (
                  <TR key={r.externalId} data-state={selected.has(r.externalId) ? "selected" : undefined}>
                    <TD>
                      <Checkbox
                        checked={selected.has(r.externalId)}
                        onCheckedChange={(v) => {
                          const n = new Set(selected);
                          if (v) n.add(r.externalId);
                          else n.delete(r.externalId);
                          setSelected(n);
                        }}
                        aria-label={`Select ${r.name}`}
                      />
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.name} className="size-7" />
                        <button onClick={() => setPreview(r)} className="whitespace-nowrap font-medium hover:text-primary">
                          {r.name}
                        </button>
                        <a href={r.linkedinUrl} target="_blank" rel="noreferrer noopener" className="text-info/80 hover:text-info" aria-label="LinkedIn profile">
                          <Linkedin className="size-3.5" />
                        </a>
                        {r.leadId && <Badge tone="success">Saved</Badge>}
                      </div>
                    </TD>
                    <TD>
                      <p className="max-w-[200px] truncate">{r.title}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.seniority}</p>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded border bg-muted text-[10px] font-semibold uppercase">{r.company[0]}</span>
                        <div className="min-w-0">
                          <p className="max-w-[160px] truncate">{r.company}</p>
                          <p className="text-[11px] text-muted-foreground">{r.domain}</p>
                        </div>
                      </div>
                    </TD>
                    <TD className="whitespace-nowrap text-muted-foreground">{r.industry}</TD>
                    <TD className="whitespace-nowrap">{r.location}</TD>
                    <TD>
                      <EmailCell email={r.email} status={r.emailStatus} />
                    </TD>
                    <TD>
                      <EmailStatusCell status={r.emailStatus} />
                    </TD>
                    <TD className="whitespace-nowrap text-muted-foreground">{r.size}</TD>
                    <TD>
                      <RowMenu
                        row={r}
                        canEdit={canEdit}
                        onAdd={() => setListDialog([r.externalId])}
                        onVerify={() => doVerify([r.externalId])}
                        onView={() => (r.leadId ? router.push(`/leads/${r.leadId}`) : setPreview(r))}
                        onRemove={() => setHidden(new Set(hidden).add(r.externalId))}
                        onExport={() => doExport([r.externalId])}
                      />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <div className="divide-y">
              {companies.map((c) => (
                <div key={c.domain} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted text-sm font-semibold">{c.name[0]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.domain} · {c.industry} · {c.size} employees · {c.revenue} · {c.location}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {c.techs.map((t) => (
                        <Badge key={t}>{t}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {c.people.slice(0, 4).map((p) => (
                        <Avatar key={p.externalId} name={p.name} className="size-7 ring-2 ring-card" />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">{c.people.length} contacts</span>
                    {canEdit && (
                      <Button size="sm" variant="secondary" onClick={() => setListDialog(c.people.map((p) => p.externalId))}>
                        <ListPlus /> Add all
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-[13px] text-muted-foreground">
          <span>
            Page {page} of {pages} · showing {(page - 1) * pageSize + (visible.length ? 1 : 0)}–{(page - 1) * pageSize + visible.length} of {formatNumber(total)}
          </span>
          <div className="flex gap-1.5">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => update({ page: String(page - 1) }, false)}>
              <ChevronLeft /> Prev
            </Button>
            <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => update({ page: String(page + 1) }, false)}>
              Next <ChevronRight />
            </Button>
          </div>
        </div>
      </div>

      {listDialog && (
        <AddToListDialog
          open
          onOpenChange={(v) => !v && setListDialog(null)}
          lists={lists}
          count={listDialog.length}
          costNote={`Revealing new leads costs 1 credit each — ${cost(listDialog)} credit${cost(listDialog) === 1 ? "" : "s"} for this selection.`}
          onSubmit={async (t) => {
            const ok = await exec(() => addProspectsToList({ externalIds: listDialog, ...t }));
            if (ok) setSelected(new Set());
            return ok;
          }}
        />
      )}

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        {preview && (
          <DialogContent title={preview.name} description={`${preview.title} at ${preview.company}`} size="md">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
              {[
                ["Email", preview.email],
                ["Email status", preview.emailStatus ?? "Hidden until revealed"],
                ["Seniority", preview.seniority],
                ["Department", preview.department],
                ["Company", `${preview.company} (${preview.domain})`],
                ["Industry", preview.industry],
                ["Company size", preview.size],
                ["Revenue", preview.revenue],
                ["Location", preview.location],
                ["Keywords", preview.keywords.join(", ")],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="label-caps">{k}</dt>
                  <dd className="mt-0.5 break-words">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex flex-wrap gap-1">
              {preview.technologies.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="secondary" asChild>
                <a href={preview.linkedinUrl} target="_blank" rel="noreferrer noopener">
                  <Linkedin /> LinkedIn
                </a>
              </Button>
              {preview.leadId ? (
                <Button asChild>
                  <Link href={`/leads/${preview.leadId}`}>Open lead profile</Link>
                </Button>
              ) : (
                canEdit && (
                  <Button
                    onClick={() => {
                      setListDialog([preview.externalId]);
                      setPreview(null);
                    }}
                  >
                    <ListPlus /> Reveal & add to list · 1 cr
                  </Button>
                )
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function RowMenu({
  row,
  canEdit,
  onAdd,
  onVerify,
  onView,
  onRemove,
  onExport,
}: {
  row: ProspectRow;
  canEdit: boolean;
  onAdd: () => void;
  onVerify: () => void;
  onView: () => void;
  onRemove: () => void;
  onExport: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${row.name}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {canEdit && (
          <DropdownMenuItem onSelect={onAdd}>
            <ListPlus /> Add to list
          </DropdownMenuItem>
        )}
        {canEdit && (
          <DropdownMenuItem onSelect={onVerify}>
            <MailCheck /> Verify email
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={onView}>
          <Eye /> View lead
        </DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem onSelect={onExport}>
            <Download /> Export CSV
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onRemove}>
          <EyeOff /> Remove from results
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterGroup({ title, count, children, defaultOpen }: { title: string; count: number; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen || count > 0);
  return (
    <div className="border-t pt-3">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between">
        <span className="label-caps flex items-center gap-2 text-foreground/80">
          {title}
          {count > 0 && <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground">{count}</span>}
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

function CheckFilter({ title, k, options, values, onToggle }: { title: string; k: string; options: string[]; values: string[]; onToggle: (k: string, v: string) => void }) {
  return (
    <FilterGroup title={title} count={values.length}>
      <div className="max-h-52 space-y-0.5 overflow-y-auto pr-1 scrollbar-thin">
        {options.map((o) => (
          <label key={o} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-[13px] hover:bg-accent">
            <Checkbox checked={values.includes(o)} onCheckedChange={() => onToggle(k, o)} />
            {o}
          </label>
        ))}
      </div>
    </FilterGroup>
  );
}

function TextFilter({ title, placeholder, values, onChange }: { title: string; k: string; placeholder: string; values: string[]; onChange: (v: string[]) => void }) {
  const [v, setV] = useState("");
  return (
    <FilterGroup title={title} count={values.length}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (v.trim()) onChange([...values, v.trim()]);
          setV("");
        }}
      >
        <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={`${placeholder} ↵`} className="h-8 text-xs" />
      </form>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {values.map((x) => (
            <Badge key={x} tone="primary" className="gap-1">
              {x}
              <button onClick={() => onChange(values.filter((y) => y !== x))} aria-label={`Remove ${x}`}>
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </FilterGroup>
  );
}

function DepartmentFilter({ include, exclude, onChange }: { include: string[]; exclude: string[]; onChange: (inc: string[], exc: string[]) => void }) {
  const [mode, setMode] = useState<"inc" | "exc">("inc");
  return (
    <FilterGroup title="Department" count={include.length + exclude.length}>
      <div className="mb-2 grid grid-cols-2 overflow-hidden rounded-md border text-xs">
        <button onClick={() => setMode("inc")} className={cn("py-1.5 font-medium", mode === "inc" ? "bg-primary/10 text-primary" : "text-muted-foreground")}>
          + Include
        </button>
        <button onClick={() => setMode("exc")} className={cn("border-l py-1.5 font-medium", mode === "exc" ? "bg-destructive/10 text-destructive" : "text-muted-foreground")}>
          − Exclude
        </button>
      </div>
      <div className="max-h-52 space-y-0.5 overflow-y-auto scrollbar-thin">
        {FILTER_OPTIONS.departments.map((d) => {
          const inc = include.includes(d);
          const exc = exclude.includes(d);
          return (
            <label key={d} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-[13px] hover:bg-accent">
              <Checkbox
                checked={mode === "inc" ? inc : exc}
                onCheckedChange={() => {
                  if (mode === "inc") onChange(inc ? include.filter((x) => x !== d) : [...include, d], exclude.filter((x) => x !== d));
                  else onChange(include.filter((x) => x !== d), exc ? exclude.filter((x) => x !== d) : [...exclude, d]);
                }}
              />
              <span className={cn(exc && "text-destructive line-through")}>{d}</span>
            </label>
          );
        })}
      </div>
    </FilterGroup>
  );
}
