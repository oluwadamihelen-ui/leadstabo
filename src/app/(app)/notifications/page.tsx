import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { NotificationsList } from "./notifications-list";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const ctx = await requireWorkspace();
  const items = await db.notification.findMany({
    where: { workspaceId: ctx.workspaceId, OR: [{ userId: null }, { userId: ctx.user.id }] },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <>
      <PageHeader title="Notifications" description="Campaign launches, replies, deliverability alerts, credits and academy milestones." />
      <Card className="p-2">
        {items.length === 0 ? (
          <EmptyState icon={Bell} title="You’re all caught up" />
        ) : (
          <NotificationsList
            items={items.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, href: n.href, readAt: n.readAt?.toISOString() ?? null, createdAt: n.createdAt.toISOString() }))}
          />
        )}
      </Card>
    </>
  );
}
