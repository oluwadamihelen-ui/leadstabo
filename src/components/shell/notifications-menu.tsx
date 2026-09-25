"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  Coins,
  GraduationCap,
  MailCheck,
  MessageSquareHeart,
  Rocket,
  ShieldAlert,
  Unplug,
  Users,
  type LucideIcon,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { cn, timeAgo } from "@/lib/utils";
import { markNotificationsRead } from "@/server/actions/account";
import { useAction } from "@/components/hooks/use-action";
import type { ShellNotification } from "./types";

export const NOTIFICATION_ICONS: Record<string, { icon: LucideIcon; tone: string }> = {
  CAMPAIGN_LAUNCHED: { icon: Rocket, tone: "text-primary bg-primary/10" },
  CAMPAIGN_COMPLETED: { icon: CheckCheck, tone: "text-violet bg-violet/10" },
  POSITIVE_REPLY: { icon: MessageSquareHeart, tone: "text-success bg-success/10" },
  BOUNCE_SPIKE: { icon: AlertTriangle, tone: "text-warning bg-warning/10" },
  DOMAIN_ISSUE: { icon: ShieldAlert, tone: "text-destructive bg-destructive/10" },
  INBOX_DISCONNECTED: { icon: Unplug, tone: "text-destructive bg-destructive/10" },
  VERIFICATION_COMPLETED: { icon: MailCheck, tone: "text-info bg-info/10" },
  LOW_CREDITS: { icon: Coins, tone: "text-warning bg-warning/10" },
  ACADEMY_MILESTONE: { icon: GraduationCap, tone: "text-violet bg-violet/10" },
  TEAM: { icon: Users, tone: "text-info bg-info/10" },
};

export function NotificationRow({ n, onOpen }: { n: ShellNotification; onOpen?: () => void }) {
  const meta = NOTIFICATION_ICONS[n.type] ?? { icon: Bell, tone: "text-muted-foreground bg-muted" };
  const Icon = meta.icon;
  const content = (
    <div className={cn("flex gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-accent", !n.readAt && "bg-primary/[0.04]")}>
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", meta.tone)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[13px] font-medium">
          <span className="truncate">{n.title}</span>
          {!n.readAt && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
        </p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
        <p className="mt-1 text-[11px] text-muted-foreground/70">{timeAgo(n.createdAt)}</p>
      </div>
    </div>
  );
  return n.href ? (
    <Link href={n.href} onClick={onOpen}>
      {content}
    </Link>
  ) : (
    <button className="w-full text-left" onClick={onOpen}>
      {content}
    </button>
  );
}

export function NotificationsMenu({ items, unread }: { items: ShellNotification[]; unread: number }) {
  const { exec } = useAction();
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Notifications">
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <p className="text-[13px] font-semibold">Notifications</p>
          {unread > 0 && (
            <button className="text-xs text-primary hover:underline" onClick={() => exec(() => markNotificationsRead())}>
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[420px] overflow-y-auto p-1.5 scrollbar-thin">
          {items.length === 0 ? (
            <p className="px-3 py-10 text-center text-xs text-muted-foreground">You’re all caught up.</p>
          ) : (
            items.map((n) => (
              <NotificationRow key={n.id} n={n} onOpen={() => !n.readAt && exec(() => markNotificationsRead([n.id]))} />
            ))
          )}
        </div>
        <button onClick={() => router.push("/notifications")} className="w-full border-t py-2.5 text-center text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
          View all notifications
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
