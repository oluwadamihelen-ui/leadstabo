"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {

  Check,
  ChevronsUpDown,
  Coins,
  CreditCard,
  HelpCircle,
  KeyRound,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  User,
  Users,
} from "lucide-react";
import { Avatar, Kbd } from "@/components/ui/misc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/tooltip";
import { formatNumber } from "@/lib/utils";
import { logout } from "@/server/actions/auth";
import { setTheme, switchWorkspace } from "@/server/actions/account";
import { useAction } from "@/components/hooks/use-action";
import { NotificationsMenu } from "./notifications-menu";
import type { ShellData } from "./types";

export function Topbar({ data, onMenu, onSearch }: { data: ShellData; onMenu: () => void; onSearch: () => void }) {
  const router = useRouter();
  const { exec } = useAction();

  function toggleTheme() {
    const dark = document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", !dark);
    exec(() => setTheme(dark ? "LIGHT" : "DARK"), { refresh: false });
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md sm:px-5">
      <button className="rounded-md p-2 text-muted-foreground hover:bg-accent lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="size-5" />
      </button>

      <button
        onClick={onSearch}
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-md border bg-surface px-3 text-[13px] text-muted-foreground transition-colors hover:bg-accent"
      >
        <Search className="size-4" />
        <span className="flex-1 truncate text-left">Search leads, campaigns, lessons…</span>
        <Kbd className="hidden sm:inline">⌘K</Kbd>
      </button>

      <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger className="hidden h-9 items-center gap-2 rounded-md border bg-surface px-2.5 text-[13px] font-medium hover:bg-accent md:flex">
            <span className="flex size-5 items-center justify-center rounded bg-primary/15 text-[10px] font-bold text-primary">
              {data.workspace.name[0]?.toUpperCase()}
            </span>
            <span className="max-w-[140px] truncate">{data.workspace.name}</span>
            <ChevronsUpDown className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            {data.workspaces.map((w) => (
              <DropdownMenuItem
                key={w.id}
                onSelect={() => w.id !== data.workspace.id && exec(() => switchWorkspace(w.id), { success: `Switched to ${w.name}` })}
              >
                <span className="flex size-5 items-center justify-center rounded bg-primary/15 text-[10px] font-bold text-primary">{w.name[0]?.toUpperCase()}</span>
                <span className="flex-1 truncate">{w.name}</span>
                <span className="text-[10px] uppercase text-muted-foreground">{w.role}</span>
                {w.id === data.workspace.id && <Check className="!text-primary" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/settings/team")}>
              <Users /> Manage team
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip content="Credits balance">
          <Link
            href="/settings/billing"
            className="flex h-9 items-center gap-1.5 rounded-md border border-primary/25 bg-primary/10 px-2.5 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/15"
          >
            <Coins className="size-4" />
            <span className="tabular-nums">{formatNumber(data.credits.balance)}</span>
            <span className="hidden font-normal opacity-80 sm:inline">credits</span>
          </Link>
        </Tooltip>

        <Tooltip content="Toggle theme">
          <button onClick={toggleTheme} className="hidden size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground sm:flex" aria-label="Toggle theme">
            <Sun className="size-[18px] dark:hidden" />
            <Moon className="hidden size-[18px] dark:block" />
          </button>
        </Tooltip>

        <NotificationsMenu items={data.notifications} unread={data.unread} />

        <Tooltip content="Help & support">
          <Link href="/help" className="hidden size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground sm:flex" aria-label="Help">
            <HelpCircle className="size-[18px]" />
          </Link>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 hover:bg-accent sm:pr-2">
            <Avatar name={data.user.name} src={data.user.avatarUrl} className="size-7" />
            <span className="hidden max-w-[120px] truncate text-[13px] font-medium xl:block">{data.user.name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60">
            <div className="px-2 py-2">
              <p className="truncate text-[13px] font-medium">{data.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{data.user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/settings/profile")}>
              <User /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/settings/security")}>
              <Settings /> Account settings
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/settings/billing")}>
              <CreditCard /> Billing
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/settings/team")}>
              <Users /> Team
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/settings/api-keys")}>
              <KeyRound /> API keys
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => logout()}>
              <LogOut /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

