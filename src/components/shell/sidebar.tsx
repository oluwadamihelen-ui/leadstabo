"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, CreditCard, HelpCircle, LifeBuoy, LogOut, Search, Users, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { Avatar, Kbd, Progress } from "@/components/ui/misc";
import { cn, compactNumber, formatNumber } from "@/lib/utils";
import { logout } from "@/server/actions/auth";
import { NAV } from "./nav";
import type { ShellData } from "./types";

export function Sidebar({ data, open, onClose, onSearch }: { data: ShellData; open: boolean; onClose: () => void; onSearch: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string, match?: string[]) =>
    (match ?? [href]).some((m) => pathname === m || pathname.startsWith(`${m}/`)) || pathname === href;
  const [expanded, setExpanded] = useState<string | null>(() => NAV.find((n) => n.children && isActive(n.href, n.match))?.label ?? null);

  useEffect(() => {
    const cur = NAV.find((n) => n.children && isActive(n.href, n.match));
    if (cur) setExpanded(cur.label);
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const usagePct = data.plan.monthlySends ? (data.usage.sent / data.plan.monthlySends) * 100 : 0;

  return (
    <>
      <div className={cn("fixed inset-0 z-40 bg-black/60 lg:hidden", open ? "block" : "hidden")} onClick={onClose} />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r bg-surface transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          <Link href="/dashboard">
            <Logo plan={data.plan.name} />
          </Link>
          <button className="rounded-md p-1 text-muted-foreground hover:bg-accent lg:hidden" onClick={onClose} aria-label="Close menu">
            <X className="size-4" />
          </button>
        </div>

        <div className="px-3 pt-3">
          <button
            onClick={onSearch}
            className="flex h-9 w-full items-center gap-2 rounded-md border bg-background/60 px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-accent"
          >
            <Search className="size-4" />
            <span className="flex-1 text-left">Search…</span>
            <Kbd>⌘K</Kbd>
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3 scrollbar-thin">
          {NAV.map((item) => {
            const active = isActive(item.href, item.match);
            const isOpen = expanded === item.label;
            return (
              <div key={item.label}>
                <div className="relative flex items-center">
                  {active && <span className="absolute -left-3 h-5 w-0.5 rounded-r bg-primary" />}
                  <Link
                    href={item.href}
                    onClick={() => item.children && setExpanded(item.label)}
                    className={cn(
                      "flex h-9 flex-1 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                      active && "bg-accent text-foreground",
                    )}
                  >
                    <item.icon className={cn("size-[18px]", active && "text-primary")} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="rounded border border-primary/30 bg-primary/10 px-1 text-[9px] font-semibold uppercase tracking-wider text-primary">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                  {item.children && (
                    <button
                      aria-label={`Toggle ${item.label}`}
                      onClick={() => setExpanded(isOpen ? null : item.label)}
                      className="absolute right-1 rounded p-1 text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDown className={cn("size-3.5 transition-transform", !isOpen && "-rotate-90")} />
                    </button>
                  )}
                </div>
                {item.children && isOpen && (
                  <div className="ml-[21px] mt-0.5 space-y-0.5 border-l pl-3">
                    {item.children.map((c) => {
                      const childActive =
                        pathname === c.href ||
                        (c.href !== "/academy" && c.href !== "/leads" && pathname.startsWith(`${c.href}/`)) ||
                        (c.href === "/leads" && pathname.startsWith("/leads/"));
                      return (
                        <Link
                          key={c.href}
                          href={c.href}
                          className={cn(
                            "block rounded-md px-2 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground",
                            childActive && "font-medium text-foreground",
                          )}
                        >
                          {c.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t px-3 py-3">
          <p className="label-caps px-2.5 pb-2">Workspace</p>
          <Link href="/settings/team" className="flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground">
            <Users className="size-4" /> Team
          </Link>
          <Link href="/help" className="flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground">
            <LifeBuoy className="size-4" /> Support
          </Link>
          <Link href="/help#faq" className="flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground">
            <HelpCircle className="size-4" /> Help
          </Link>
        </div>

        <div className="space-y-3 border-t p-3">
          <Link href="/settings/billing" className="block rounded-lg border bg-background/50 p-3 transition-colors hover:bg-accent/50">
            <div className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-2 font-medium">
                <CreditCard className="size-4 text-primary" /> Credits
              </span>
              <span className="font-semibold tabular-nums">{formatNumber(data.credits.balance)}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {compactNumber(data.credits.monthly)} monthly · {compactNumber(data.credits.lifetime)} lifetime
            </p>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Sends this period</span>
              <span className="tabular-nums">
                {compactNumber(data.usage.sent)} / {compactNumber(data.plan.monthlySends)}
              </span>
            </div>
            <Progress value={usagePct} className="mt-1" tone={usagePct > 90 ? "danger" : "primary"} />
          </Link>
          <div className="flex items-center gap-2.5 px-1">
            <Avatar name={data.user.name} src={data.user.avatarUrl} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{data.user.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{data.workspace.name}</p>
            </div>
            <form action={logout}>
              <button className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Sign out" title="Sign out">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
