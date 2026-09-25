import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { PasswordForm, SessionsList, TwoFactorCard } from "./security-client";

export const metadata: Metadata = { title: "Security" };

export default async function SecurityPage() {
  const ctx = await requireWorkspace();
  const sessions = await db.session.findMany({ where: { userId: ctx.user.id, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" } });
  return (
    <div className="space-y-6">
      <PasswordForm />
      <TwoFactorCard enabled={ctx.user.twoFactorEnabled} />
      <SessionsList
        current={ctx.sessionId}
        sessions={sessions.map((s) => ({ id: s.id, userAgent: s.userAgent, ip: s.ip, lastSeenAt: s.lastSeenAt.toISOString(), createdAt: s.createdAt.toISOString() }))}
      />
    </div>
  );
}
