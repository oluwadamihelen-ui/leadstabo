"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getSession } from "@/lib/auth/session";
import { verifyTotp } from "@/lib/auth/totp";
import { decrypt, sha256 } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { email, password, requiredText } from "@/lib/validation";
import { createWorkspaceFor } from "@/lib/services/workspace";
import { run, type ActionResult } from "../action";

const DUMMY_HASH = "$2b$12$yVk6FPIYtiybVLLOcfKP6OXMEM/b7oHQD01wXkbRHwv35tfLm22Ym";

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "local").split(",")[0].trim();
}

const signupSchema = z.object({
  name: requiredText("Name", 80),
  email,
  password,
  company: requiredText("Company", 120),
  invite: z.string().max(200).optional(),
});

export async function signup(input: z.input<typeof signupSchema>): Promise<ActionResult<{ redirect: string }>> {
  return run(async () => {
    const ip = await clientIp();
    if (!rateLimit(`signup:${ip}`, 10, 60 * 60_000).ok) return { ok: false, error: "Too many attempts. Try again later." };
    const data = signupSchema.parse(input);
    if (await db.user.findUnique({ where: { email: data.email } })) {
      return { ok: false, error: "An account with this email already exists" };
    }
    const user = await db.user.create({
      data: { name: data.name, email: data.email, company: data.company, passwordHash: await hashPassword(data.password) },
    });

    // Accept a pending invitation if one was supplied, otherwise create a fresh workspace.
    let joined = false;
    if (data.invite) {
      const inv = await db.teamInvitation.findUnique({ where: { tokenHash: sha256(data.invite) } });
      if (inv && inv.status === "PENDING" && inv.expiresAt > new Date() && inv.email === data.email) {
        await db.workspaceMember.create({ data: { workspaceId: inv.workspaceId, userId: user.id, role: inv.role } });
        await db.teamInvitation.update({ where: { id: inv.id }, data: { status: "ACCEPTED" } });
        await db.user.update({ where: { id: user.id }, data: { lastWorkspaceId: inv.workspaceId } });
        joined = true;
      }
    }
    if (!joined) await createWorkspaceFor(user.id, `${data.company}`);
    await createSession(user.id);
    return { ok: true, data: { redirect: joined ? "/dashboard" : "/onboarding" } };
  });
}

const loginSchema = z.object({ email, password: z.string().min(1).max(128), code: z.string().max(10).optional() });

export async function login(
  input: z.input<typeof loginSchema>,
): Promise<ActionResult<{ needs2fa?: boolean; redirect?: string }>> {
  return run(async () => {
    const data = loginSchema.parse(input);
    const ip = await clientIp();
    const rl = rateLimit(`login:${ip}:${data.email}`, 8, 15 * 60_000);
    if (!rl.ok) return { ok: false, error: "Too many sign-in attempts. Please wait 15 minutes." };

    const user = await db.user.findUnique({ where: { email: data.email } });
    // Always run bcrypt to keep timing uniform whether or not the user exists.
    const valid = await verifyPassword(data.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) return { ok: false, error: "Incorrect email or password" };

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!data.code) return { ok: true, data: { needs2fa: true } };
      if (!verifyTotp(decrypt(user.twoFactorSecret), data.code)) return { ok: false, error: "Invalid authentication code" };
    }
    await createSession(user.id);
    return { ok: true, data: { redirect: "/dashboard" } };
  });
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function currentUserEmail() {
  return (await getSession())?.user.email ?? null;
}
