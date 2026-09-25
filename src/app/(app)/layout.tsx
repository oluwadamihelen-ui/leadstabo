import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/auth/guard";
import { AppShell } from "@/components/shell/app-shell";
import type { ShellData } from "@/components/shell/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");
  const { workspaceId, user } = ctx;

  const [sub, credits, notifications, unread] = await Promise.all([
    db.subscription.findUnique({ where: { workspaceId }, include: { plan: true } }),
    db.creditBalance.findUnique({ where: { workspaceId } }),
    db.notification.findMany({
      where: { workspaceId, OR: [{ userId: null }, { userId: user.id }] },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.notification.count({ where: { workspaceId, readAt: null, OR: [{ userId: null }, { userId: user.id }] } }),
  ]);
  const sent = await db.email.count({
    where: { workspaceId, sentAt: { gte: sub?.currentPeriodStart ?? new Date(Date.now() - 30 * 86400_000) } },
  });

  const data: ShellData = {
    user: { name: user.name, email: user.email, avatarUrl: user.avatarUrl },
    workspace: { id: ctx.workspace.id, name: ctx.workspace.name },
    role: ctx.role,
    workspaces: ctx.memberships.map((m) => ({ id: m.workspaceId, name: m.workspace.name, role: m.role })),
    plan: { name: sub?.plan.name ?? "Free", monthlySends: sub?.plan.monthlySends ?? 0 },
    credits: { balance: credits?.balance ?? 0, monthly: credits?.monthlyCredits ?? 0, lifetime: credits?.lifetimeCredits ?? 0 },
    usage: { sent },
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
    unread,
  };

  return <AppShell data={data}>{children}</AppShell>;
}
