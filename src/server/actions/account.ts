"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertWorkspace } from "@/lib/auth/guard";
import { getSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateTotpSecret, totpUri, verifyTotp } from "@/lib/auth/totp";
import { decrypt, encrypt } from "@/lib/crypto";
import { AuthError } from "@/lib/errors";
import { id, password, requiredText, text } from "@/lib/validation";
import { run } from "../action";

async function me() {
  const s = await getSession();
  if (!s) throw new AuthError("Not signed in", 401);
  return s;
}

export async function setTheme(theme: "DARK" | "LIGHT" | "SYSTEM") {
  return run(async () => {
    const t = z.enum(["DARK", "LIGHT", "SYSTEM"]).parse(theme);
    const s = await me();
    await db.user.update({ where: { id: s.userId }, data: { theme: t } });
    (await cookies()).set("lb_theme", t.toLowerCase(), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return { ok: true as const };
  });
}

export async function setAccent(accent: string) {
  return run(async () => {
    const a = z.enum(["orange", "blue", "violet", "green"]).parse(accent);
    const s = await me();
    await db.user.update({ where: { id: s.userId }, data: { accentColor: a } });
    return { ok: true as const, message: "Accent updated" };
  });
}

export async function switchWorkspace(workspaceId: string) {
  return run(async () => {
    const s = await me();
    const wid = id.parse(workspaceId);
    const m = await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: wid, userId: s.userId } } });
    if (!m) throw new AuthError("You are not a member of that workspace");
    await db.user.update({ where: { id: s.userId }, data: { lastWorkspaceId: wid } });
    return { ok: true as const };
  });
}

export async function markNotificationsRead(ids?: string[]) {
  return run(async () => {
    const ctx = await assertWorkspace("VIEWER");
    const parsed = ids ? z.array(id).max(200).parse(ids) : undefined;
    await db.notification.updateMany({
      where: { workspaceId: ctx.workspaceId, readAt: null, ...(parsed ? { id: { in: parsed } } : {}) },
      data: { readAt: new Date() },
    });
    return { ok: true as const };
  });
}

const profileSchema = z.object({
  name: requiredText("Name", 80),
  company: text(120).optional(),
  timezone: text(64),
  avatarUrl: z.union([z.literal(""), z.string().url().max(500).startsWith("https://")]).optional(),
});

export async function updateProfile(input: z.input<typeof profileSchema>) {
  return run(async () => {
    const s = await me();
    const d = profileSchema.parse(input);
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: d.timezone });
    } catch {
      return { ok: false as const, error: "Unknown timezone" };
    }
    await db.user.update({ where: { id: s.userId }, data: { ...d, avatarUrl: d.avatarUrl || null } });
    return { ok: true as const, message: "Profile saved" };
  });
}

export async function changePassword(input: { current: string; next: string }) {
  return run(async () => {
    const s = await me();
    const next = password.parse(input.next);
    if (!(await verifyPassword(input.current, s.user.passwordHash))) return { ok: false as const, error: "Current password is incorrect" };
    await db.user.update({ where: { id: s.userId }, data: { passwordHash: await hashPassword(next) } });
    // Sign out every other device after a password change.
    await db.session.deleteMany({ where: { userId: s.userId, id: { not: s.id } } });
    return { ok: true as const, message: "Password updated. Other sessions were signed out." };
  });
}

export async function beginTwoFactor() {
  return run(async () => {
    const s = await me();
    const secret = generateTotpSecret();
    await db.user.update({ where: { id: s.userId }, data: { twoFactorSecret: encrypt(secret), twoFactorEnabled: false } });
    return { ok: true as const, data: { secret, uri: totpUri(secret, s.user.email) } };
  });
}

export async function confirmTwoFactor(code: string) {
  return run(async () => {
    const s = await me();
    const u = await db.user.findUniqueOrThrow({ where: { id: s.userId } });
    if (!u.twoFactorSecret || !verifyTotp(decrypt(u.twoFactorSecret), code)) return { ok: false as const, error: "That code didn't match. Try again." };
    await db.user.update({ where: { id: s.userId }, data: { twoFactorEnabled: true } });
    return { ok: true as const, message: "Two-factor authentication enabled" };
  });
}

export async function disableTwoFactor(pw: string) {
  return run(async () => {
    const s = await me();
    if (!(await verifyPassword(pw, s.user.passwordHash))) return { ok: false as const, error: "Password is incorrect" };
    await db.user.update({ where: { id: s.userId }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
    return { ok: true as const, message: "Two-factor authentication disabled" };
  });
}

export async function revokeSession(sessionId: string) {
  return run(async () => {
    const s = await me();
    await db.session.deleteMany({ where: { id: id.parse(sessionId), userId: s.userId, NOT: { id: s.id } } });
    return { ok: true as const, message: "Session revoked" };
  });
}

export async function revokeOtherSessions() {
  return run(async () => {
    const s = await me();
    const { count } = await db.session.deleteMany({ where: { userId: s.userId, NOT: { id: s.id } } });
    return { ok: true as const, message: `Signed out ${count} other session${count === 1 ? "" : "s"}` };
  });
}
