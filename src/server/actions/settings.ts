"use server";

import { z } from "zod";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { assertWorkspace } from "@/lib/auth/guard";
import { randomToken, sha256 } from "@/lib/crypto";
import { outreachSettingsSchema } from "@/lib/outreach-settings";
import { startCheckout } from "@/lib/services/billing";
import { CURRENCIES } from "@/lib/currency";
import { notify } from "@/lib/services/notifications";
import { email, id, requiredText } from "@/lib/validation";
import { addDays } from "@/lib/utils";
import { run, UserError, type ActionResult } from "../action";

// ── Workspace ────────────────────────────────────────────────────────────

export async function renameWorkspace(name: string) {
  return run(async () => {
    const ctx = await assertWorkspace("ADMIN");
    await db.workspace.update({ where: { id: ctx.workspaceId }, data: { name: requiredText("Workspace name", 80).parse(name) } });
    return { ok: true as const, message: "Workspace renamed" };
  });
}

export async function saveOutreachSettings(input: z.input<typeof outreachSettingsSchema>) {
  return run(async () => {
    const ctx = await assertWorkspace("ADMIN");
    const d = outreachSettingsSchema.parse(input);
    if (d.sendWindowEnd <= d.sendWindowStart) throw new UserError("Send window end must be after start");
    await db.workspace.update({ where: { id: ctx.workspaceId }, data: { outreachSettings: d } });
    return { ok: true as const, message: "Outreach defaults saved" };
  });
}

// ── Team ─────────────────────────────────────────────────────────────────

const roleSchema = z.enum(["ADMIN", "MEMBER", "VIEWER"]);

export async function inviteMember(input: { email: string; role: Role }): Promise<ActionResult<{ link: string }>> {
  return run<{ link: string }>(async () => {
    const ctx = await assertWorkspace("ADMIN");
    const em = email.parse(input.email);
    const role = roleSchema.parse(input.role);
    const sub = await db.subscription.findUnique({ where: { workspaceId: ctx.workspaceId }, include: { plan: true } });
    const [members, pending] = await Promise.all([
      db.workspaceMember.count({ where: { workspaceId: ctx.workspaceId } }),
      db.teamInvitation.count({ where: { workspaceId: ctx.workspaceId, status: "PENDING" } }),
    ]);
    if (sub && members + pending >= sub.plan.teamMembers) throw new UserError(`Your ${sub.plan.name} plan includes ${sub.plan.teamMembers} seats — upgrade to add more`);
    if (await db.workspaceMember.findFirst({ where: { workspaceId: ctx.workspaceId, user: { email: em } } })) throw new UserError("That person is already a member");
    await db.teamInvitation.updateMany({ where: { workspaceId: ctx.workspaceId, email: em, status: "PENDING" }, data: { status: "REVOKED" } });
    const token = randomToken(24);
    await db.teamInvitation.create({
      data: { workspaceId: ctx.workspaceId, email: em, role, tokenHash: sha256(token), invitedById: ctx.user.id, expiresAt: addDays(new Date(), 7) },
    });
    await notify(ctx.workspaceId, { type: "TEAM", title: "Invitation sent", body: `${ctx.user.name} invited ${em} as ${role.toLowerCase()}.`, href: "/settings/team" });
    const base = process.env.APP_URL ?? "http://localhost:3000";
    // Existing users accept at /invite; new users sign up with the token.
    return { ok: true, data: { link: `${base}/invite/${token}` }, message: "Invitation created" };
  });
}

export async function revokeInvitation(invitationId: string) {
  return run(async () => {
    const ctx = await assertWorkspace("ADMIN");
    const { count } = await db.teamInvitation.updateMany({ where: { id: id.parse(invitationId), workspaceId: ctx.workspaceId, status: "PENDING" }, data: { status: "REVOKED" } });
    if (!count) throw new UserError("Invitation not found");
    return { ok: true as const, message: "Invitation revoked" };
  });
}

export async function changeMemberRole(memberId: string, role: Role) {
  return run(async () => {
    const ctx = await assertWorkspace("ADMIN");
    const r = z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]).parse(role);
    const m = await db.workspaceMember.findFirst({ where: { id: id.parse(memberId), workspaceId: ctx.workspaceId } });
    if (!m) throw new UserError("Member not found");
    if (m.userId === ctx.user.id) throw new UserError("You can’t change your own role");
    if ((r === "OWNER" || m.role === "OWNER") && ctx.role !== "OWNER") throw new UserError("Only the owner can transfer ownership");
    if (m.role === "OWNER" && r !== "OWNER") {
      const owners = await db.workspaceMember.count({ where: { workspaceId: ctx.workspaceId, role: "OWNER" } });
      if (owners <= 1) throw new UserError("A workspace needs at least one owner");
    }
    await db.workspaceMember.update({ where: { id: m.id }, data: { role: r } });
    return { ok: true as const, message: "Role updated" };
  });
}

export async function removeMember(memberId: string) {
  return run(async () => {
    const ctx = await assertWorkspace("ADMIN");
    const m = await db.workspaceMember.findFirst({ where: { id: id.parse(memberId), workspaceId: ctx.workspaceId } });
    if (!m) throw new UserError("Member not found");
    if (m.userId === ctx.user.id) throw new UserError("You can’t remove yourself");
    if (m.role === "OWNER") throw new UserError("Transfer ownership before removing an owner");
    await db.workspaceMember.delete({ where: { id: m.id } });
    return { ok: true as const, message: "Member removed" };
  });
}

// ── API keys ─────────────────────────────────────────────────────────────

export async function createApiKey(name: string): Promise<ActionResult<{ key: string }>> {
  return run<{ key: string }>(async () => {
    const ctx = await assertWorkspace("ADMIN");
    const n = requiredText("Key name", 60).parse(name);
    const active = await db.apiKey.count({ where: { workspaceId: ctx.workspaceId, revokedAt: null } });
    if (active >= 20) throw new UserError("Maximum of 20 active keys");
    const key = `lsk_live_${randomToken(24)}`;
    await db.apiKey.create({ data: { workspaceId: ctx.workspaceId, name: n, prefix: key.slice(0, 13), keyHash: sha256(key), createdById: ctx.user.id } });
    // The raw key is returned exactly once and never stored.
    return { ok: true, data: { key }, message: "API key created" };
  });
}

export async function revokeApiKey(keyId: string) {
  return run(async () => {
    const ctx = await assertWorkspace("ADMIN");
    const { count } = await db.apiKey.updateMany({ where: { id: id.parse(keyId), workspaceId: ctx.workspaceId, revokedAt: null }, data: { revokedAt: new Date() } });
    if (!count) throw new UserError("Key not found");
    return { ok: true as const, message: "API key revoked" };
  });
}

// ── Billing ──────────────────────────────────────────────────────────────

const gatewayKey = z.enum(["paystack", "flutterwave", "korapay", "test"]);
const currencySchema = z.enum(CURRENCIES);

export async function setBillingCurrency(currency: string) {
  return run(async () => {
    const ctx = await assertWorkspace("ADMIN");
    await db.workspace.update({ where: { id: ctx.workspaceId }, data: { billingCurrency: currencySchema.parse(currency) } });
    return { ok: true as const };
  });
}

export async function startPlanCheckout(input: { planKey: string; interval: "MONTHLY" | "ANNUAL"; gateway: string; currency: string }): Promise<ActionResult<{ redirect: string }>> {
  return run<{ redirect: string }>(async () => {
    const ctx = await assertWorkspace("OWNER");
    const plan = await db.plan.findUnique({ where: { key: z.string().max(40).parse(input.planKey) } });
    if (!plan) throw new UserError("Plan not found");
    if (plan.contactSales) throw new UserError("Enterprise is custom — contact sales@leadabo.com");
    const inboxes = await db.inbox.count({ where: { workspaceId: ctx.workspaceId } });
    if (inboxes > plan.inboxLimit) throw new UserError(`You have ${inboxes} inboxes; ${plan.name} allows ${plan.inboxLimit}. Remove some first.`);
    const currency = currencySchema.parse(input.currency);
    await db.workspace.update({ where: { id: ctx.workspaceId }, data: { billingCurrency: currency } });
    const { url } = await startCheckout({
      workspaceId: ctx.workspaceId,
      user: { id: ctx.user.id, email: ctx.user.email, name: ctx.user.name },
      gateway: gatewayKey.parse(input.gateway),
      currency,
      purpose: "PLAN",
      planKey: plan.key,
      interval: z.enum(["MONTHLY", "ANNUAL"]).parse(input.interval),
    });
    return { ok: true, data: { redirect: url }, message: "Opening secure checkout…" };
  });
}

export async function startCreditCheckout(input: { credits: number; gateway: string; currency: string }): Promise<ActionResult<{ redirect: string }>> {
  return run<{ redirect: string }>(async () => {
    const ctx = await assertWorkspace("ADMIN");
    const currency = currencySchema.parse(input.currency);
    const { url } = await startCheckout({
      workspaceId: ctx.workspaceId,
      user: { id: ctx.user.id, email: ctx.user.email, name: ctx.user.name },
      gateway: gatewayKey.parse(input.gateway),
      currency,
      purpose: "CREDITS",
      credits: z.number().int().positive().parse(input.credits),
    });
    return { ok: true, data: { redirect: url }, message: "Opening secure checkout…" };
  });
}
