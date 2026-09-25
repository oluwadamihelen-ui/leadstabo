import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";

export const SESSION_COOKIE = "lb_session";
const SESSION_TTL_DAYS = 30;

export async function createSession(userId: string) {
  const token = randomToken(32);
  const h = await headers();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86400_000);
  await db.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      expiresAt,
      userAgent: h.get("user-agent")?.slice(0, 255) ?? null,
      ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Resolves the current session (once per request). Returns null if missing/expired. */
export const getSession = cache(async () => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  // Touch at most every 5 minutes to avoid a write per request.
  if (Date.now() - session.lastSeenAt.getTime() > 5 * 60_000) {
    await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }
  return session;
});

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}
