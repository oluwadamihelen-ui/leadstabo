"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Globe, Inbox, KeyRound, Flame, Palette, Send, Shield, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const GROUPS = [
  {
    label: "Account",
    items: [
      { href: "/settings/profile", label: "Profile", icon: User },
      { href: "/settings/appearance", label: "Appearance", icon: Palette },
      { href: "/settings/security", label: "Security", icon: Shield },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/settings/team", label: "Team", icon: Users },
      { href: "/settings/billing", label: "Billing & Plans", icon: CreditCard },
      { href: "/settings/outreach", label: "Outreach", icon: Send },
      { href: "/settings/api-keys", label: "API Keys", icon: KeyRound },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { href: "/settings/infrastructure/domains", label: "Sending Domains", icon: Globe },
      { href: "/settings/infrastructure/inboxes", label: "Sending Inboxes", icon: Inbox },
      { href: "/settings/infrastructure/warmup", label: "Warmup", icon: Flame },
    ],
  },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:gap-5 lg:overflow-visible lg:px-0">
      {GROUPS.map((g) => (
        <div key={g.label} className="flex shrink-0 gap-1 lg:flex-col">
          <p className="label-caps hidden px-2.5 pb-1 lg:block">{g.label}</p>
          {g.items.map((i) => {
            const active = pathname === i.href || pathname.startsWith(`${i.href}/`);
            return (
              <Link
                key={i.href}
                href={i.href}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  active && "bg-accent font-medium text-foreground",
                )}
              >
                <i.icon className={cn("size-4", active && "text-primary")} />
                {i.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
