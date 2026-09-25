"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NotificationRow } from "@/components/shell/notifications-menu";
import type { ShellNotification } from "@/components/shell/types";
import { useAction } from "@/components/hooks/use-action";
import { markNotificationsRead } from "@/server/actions/account";
import { cn } from "@/lib/utils";

const FILTERS = [
  ["all", "All"],
  ["unread", "Unread"],
  ["CAMPAIGN", "Campaigns"],
  ["REPLY", "Replies"],
  ["INFRA", "Deliverability"],
  ["ACADEMY_MILESTONE", "Academy"],
] as const;

export function NotificationsList({ items }: { items: ShellNotification[] }) {
  const { exec, pending } = useAction();
  const [f, setF] = useState<string>("all");
  const shown = items.filter((n) => {
    if (f === "all") return true;
    if (f === "unread") return !n.readAt;
    if (f === "CAMPAIGN") return n.type.startsWith("CAMPAIGN");
    if (f === "REPLY") return n.type === "POSITIVE_REPLY";
    if (f === "INFRA") return ["BOUNCE_SPIKE", "DOMAIN_ISSUE", "INBOX_DISCONNECTED", "VERIFICATION_COMPLETED", "LOW_CREDITS"].includes(n.type);
    return n.type === f;
  });
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 border-b p-2">
        {FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => setF(k)} className={cn("rounded-md px-2.5 py-1 text-xs", f === k ? "bg-accent font-medium" : "text-muted-foreground hover:text-foreground")}>
            {l}
          </button>
        ))}
        <Button size="xs" variant="ghost" className="ml-auto" loading={pending} onClick={() => exec(() => markNotificationsRead(), { success: "All marked as read" })}>
          Mark all read
        </Button>
      </div>
      <div className="p-1">
        {shown.length === 0 && <p className="py-10 text-center text-xs text-muted-foreground">Nothing here.</p>}
        {shown.map((n) => (
          <NotificationRow key={n.id} n={n} onOpen={() => !n.readAt && exec(() => markNotificationsRead([n.id]))} />
        ))}
      </div>
    </div>
  );
}
