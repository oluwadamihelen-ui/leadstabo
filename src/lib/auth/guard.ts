import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "./session";
import { hasRole } from "./permissions";
import { AuthError } from "@/lib/errors";

export { AuthError };

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}

/**
 * Resolves the active workspace for the current user. Every tenant query must use
 * `ctx.workspaceId` from here — it is derived server-side from membership, never
 * from client input, which is what enforces workspace isolation.
 */
export const getWorkspaceContext = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const memberships = await db.workspaceMember.findMany({
    where: { userId: session.userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  if (!memberships.length) return null;
  const active = memberships.find((m) => m.workspaceId === session.user.lastWorkspaceId) ?? memberships[0];
  return {
    user: session.user,
    sessionId: session.id,
    workspace: active.workspace,
    workspaceId: active.workspaceId,
    role: active.role,
    memberships,
  };
});

export type WorkspaceContext = NonNullable<Awaited<ReturnType<typeof getWorkspaceContext>>>;

/** For pages: redirects to /login when unauthenticated. */
export async function requireWorkspace(min: Role = "VIEWER") {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");
  if (!hasRole(ctx.role, min)) redirect("/dashboard?denied=1");
  return ctx;
}

/** For server actions / API routes: throws instead of redirecting. */
export async function assertWorkspace(min: Role = "MEMBER") {
  const ctx = await getWorkspaceContext();
  if (!ctx) throw new AuthError("Not signed in", 401);
  if (!hasRole(ctx.role, min)) throw new AuthError(`This action requires the ${min.toLowerCase()} role`);
  return ctx;
}
