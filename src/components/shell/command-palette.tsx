"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Command } from "cmdk";
import * as D from "@radix-ui/react-dialog";
import {
  BookOpen,
  Building2,
  CornerDownLeft,
  FileText,
  Inbox,
  Layers,
  Loader2,
  Mail,
  Search,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";
import { NAV } from "./nav";

interface Result {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

const TYPE_META: Record<string, { label: string; icon: LucideIcon }> = {
  lead: { label: "Leads", icon: User },
  company: { label: "Companies", icon: Building2 },
  campaign: { label: "Campaigns", icon: Mail },
  sequence: { label: "Sequences", icon: Layers },
  lesson: { label: "Academy lessons", icon: BookOpen },
  conversation: { label: "Inbox conversations", icon: Inbox },
};

const SETTINGS = [
  ["Profile", "/settings/profile"],
  ["Appearance", "/settings/appearance"],
  ["Security & 2FA", "/settings/security"],
  ["Team & roles", "/settings/team"],
  ["Billing & plans", "/settings/billing"],
  ["Credits history", "/settings/billing#credits"],
  ["Outreach defaults", "/settings/outreach"],
  ["Sending domains", "/settings/infrastructure/domains"],
  ["Sending inboxes", "/settings/infrastructure/inboxes"],
  ["Email warmup", "/settings/infrastructure/warmup"],
  ["API keys", "/settings/api-keys"],
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.ok) setResults((await res.json()).results);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 160);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const grouped = results.reduce<Record<string, Result[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  const pages = NAV.flatMap((n) => (n.children ? n.children.map((c) => ({ label: `${n.label} › ${c.label}`, href: c.href })) : [{ label: n.label, href: n.href }]));

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 flex justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-[2px]">
        <D.Content className="h-fit w-full max-w-xl overflow-hidden rounded-xl border bg-popover shadow-2xl animate-fade-in">
          <D.Title className="sr-only">Search</D.Title>
          <D.Description className="sr-only">Search across Leadabo</D.Description>
          <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:label-caps [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3">
            <div className="flex items-center gap-2 border-b px-3">
              {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : <Search className="size-4 text-muted-foreground" />}
              <Command.Input value={q} onValueChange={setQ} placeholder="Search leads, companies, campaigns, lessons, settings…" className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            </div>
            <Command.List className="max-h-[400px] overflow-y-auto p-1.5 scrollbar-thin">
              <Command.Empty className="py-10 text-center text-sm text-muted-foreground">{loading ? "Searching…" : "No results found."}</Command.Empty>
              {Object.entries(grouped).map(([type, items]) => {
                const meta = TYPE_META[type];
                return (
                  <Command.Group key={type} heading={meta?.label ?? type}>
                    {items.map((r) => (
                      <Item key={`${r.type}-${r.id}`} value={`${r.type}-${r.id}`} icon={meta?.icon ?? FileText} title={r.title} subtitle={r.subtitle} onSelect={() => go(r.href)} />
                    ))}
                  </Command.Group>
                );
              })}
              {(() => {
                const s = q.toLowerCase();
                const navMatches = pages.filter((p) => !s || p.label.toLowerCase().includes(s)).slice(0, s ? 6 : 8);
                const settingMatches = SETTINGS.filter(([l]) => !s || l.toLowerCase().includes(s)).slice(0, s ? 5 : 4);
                return (
                  <>
                    {navMatches.length > 0 && (
                      <Command.Group heading="Go to">
                        {navMatches.map((p) => (
                          <Item key={p.href} value={`nav-${p.href}`} icon={CornerDownLeft} title={p.label} onSelect={() => go(p.href)} />
                        ))}
                      </Command.Group>
                    )}
                    {settingMatches.length > 0 && (
                      <Command.Group heading="Settings">
                        {settingMatches.map(([l, h]) => (
                          <Item key={h} value={`set-${h}`} icon={Settings} title={l} onSelect={() => go(h)} />
                        ))}
                      </Command.Group>
                    )}
                  </>
                );
              })()}
            </Command.List>
          </Command>
        </D.Content>
        </D.Overlay>
      </D.Portal>
    </D.Root>
  );
}

function Item({ icon: Icon, title, subtitle, onSelect, value }: { icon: LucideIcon; title: string; subtitle?: string; onSelect: () => void; value: string }) {
  return (
    <Command.Item value={value} onSelect={onSelect} className="flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-[13px] data-[selected=true]:bg-accent">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{title}</span>
      {subtitle && <span className="ml-auto truncate pl-3 text-xs text-muted-foreground">{subtitle}</span>}
    </Command.Item>
  );
}
