"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { assertWorkspace } from "@/lib/auth/guard";
import { encrypt, randomToken } from "@/lib/crypto";
import { emailProvider } from "@/lib/providers";
import type { InboxCredentials } from "@/lib/providers/types";
import { checkDomain, requiredRecords } from "@/lib/services/domains";
import { domainName, email, id, requiredText, text } from "@/lib/validation";
import { run, UserError, type ActionResult } from "../action";

export async function addDomain(domain: string): Promise<ActionResult<{ id: string }>> {
  return run<{ id: string }>(async () => {
    const ctx = await assertWorkspace("ADMIN");
    const d = domainName.parse(domain);
    if (await db.sendingDomain.findFirst({ where: { workspaceId: ctx.workspaceId, domain: d } })) throw new UserError("Domain already added");
    const token = randomToken(12).replace(/[^a-zA-Z0-9]/g, "");
    const row = await db.sendingDomain.create({
      data: { workspaceId: ctx.workspaceId, domain: d, verificationToken: token, records: { create: requiredRecords(d, token) } },
    });
    return { ok: true, data: { id: row.id }, message: "Domain added — publish the DNS records below" };
  });
}

export async function verifyDomain(domainId: string) {
  return run(async () => {
    const ctx = await assertWorkspace("ADMIN");
    const d = await checkDomain(id.parse(domainId), ctx.workspaceId);
    return { ok: true as const, message: d.status === "ACTIVE" ? "All records verified — domain is active" : d.status === "ISSUE" ? "Some records failed validation" : "Records still propagating — try again shortly" };
  });
}

export async function deleteDomain(domainId: string) {
  return run(async () => {
    const ctx = await assertWorkspace("ADMIN");
    const { count } = await db.sendingDomain.deleteMany({ where: { id: id.parse(domainId), workspaceId: ctx.workspaceId } });
    if (!count) throw new UserError("Domain not found");
    return { ok: true as const, message: "Domain removed" };
  });
}

const inboxSchema = z.object({
  provider: z.enum(["GOOGLE", "MICROSOFT", "SMTP", "OTHER"]),
  email,
  displayName: requiredText("Display name", 80),
  dailyLimit: z.number().int().min(1).max(200),
  smtpHost: text(200).optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  username: text(200).optional(),
  password: z.string().max(500).optional(),
  signature: text(1000).optional(),
  startWarmup: z.boolean(),
});

export async function addInbox(input: z.input<typeof inboxSchema>) {
  return run(async () => {
    const ctx = await assertWorkspace("ADMIN");
    const d = inboxSchema.parse(input);
    const sub = await db.subscription.findUnique({ where: { workspaceId: ctx.workspaceId }, include: { plan: true } });
    const count = await db.inbox.count({ where: { workspaceId: ctx.workspaceId } });
    if (sub && count >= sub.plan.inboxLimit) throw new UserError(`Your ${sub.plan.name} plan allows ${sub.plan.inboxLimit} inboxes — upgrade for more`);
    if (await db.inbox.findFirst({ where: { workspaceId: ctx.workspaceId, email: d.email } })) throw new UserError("Inbox already connected");

    const creds: InboxCredentials = {
      provider: d.provider,
      email: d.email,
      smtpHost: d.smtpHost,
      smtpPort: d.smtpPort,
      username: d.username || d.email,
      password: d.password,
      // OAuth providers would store the refresh token returned by the consent flow here.
      oauthToken: d.provider === "GOOGLE" || d.provider === "MICROSOFT" ? `mock-oauth-${randomToken(8)}` : undefined,
    };
    const test = await emailProvider().testConnection(creds);
    if (!test.ok) throw new UserError(`Connection failed: ${test.error}`);

    const domainPart = d.email.split("@")[1];
    const domain = await db.sendingDomain.findFirst({ where: { workspaceId: ctx.workspaceId, domain: domainPart } });
    await db.inbox.create({
      data: {
        workspaceId: ctx.workspaceId,
        domainId: domain?.id,
        email: d.email,
        displayName: d.displayName,
        provider: d.provider,
        dailyLimit: d.dailyLimit,
        signature: d.signature || null,
        healthScore: domain?.status === "ACTIVE" ? 90 : 70,
        encryptedCredentials: encrypt(JSON.stringify(creds)),
        warmup: {
          create: d.startWarmup
            ? { status: "ACTIVE", startedAt: new Date(), currentPerDay: 5, targetPerDay: Math.min(40, d.dailyLimit), rampIncrement: 2 }
            : { status: "NOT_STARTED", targetPerDay: Math.min(40, d.dailyLimit) },
        },
      },
    });
    if (domain) await db.sendingDomain.update({ where: { id: domain.id }, data: { dailyCapacity: { increment: domain.status === "ACTIVE" ? d.dailyLimit : 0 } } });
    return { ok: true as const, message: `${d.email} connected${domain ? "" : " — add its domain to verify SPF/DKIM/DMARC"}` };
  });
}

const inboxUpdate = z.object({ displayName: requiredText("Display name", 80), dailyLimit: z.number().int().min(1).max(200), signature: text(1000) });

export async function updateInbox(inboxId: string, input: z.input<typeof inboxUpdate>) {
  return run(async () => {
    const ctx = await assertWorkspace("ADMIN");
    const d = inboxUpdate.parse(input);
    const { count } = await db.inbox.updateMany({ where: { id: id.parse(inboxId), workspaceId: ctx.workspaceId }, data: { ...d, signature: d.signature || null } });
    if (!count) throw new UserError("Inbox not found");
    return { ok: true as const, message: "Inbox updated" };
  });
}

export async function setInboxStatus(inboxId: string, status: "CONNECTED" | "PAUSED") {
  return run(async () => {
    const ctx = await assertWorkspace("ADMIN");
    const s = z.enum(["CONNECTED", "PAUSED"]).parse(status);
    const { count } = await db.inbox.updateMany({ where: { id: id.parse(inboxId), workspaceId: ctx.workspaceId }, data: { status: s } });
    if (!count) throw new UserError("Inbox not found");
    return { ok: true as const, message: s === "PAUSED" ? "Inbox paused" : "Inbox reconnected" };
  });
}

export async function deleteInbox(inboxId: string) {
  return run(async () => {
    const ctx = await assertWorkspace("ADMIN");
    const active = await db.campaign.count({ where: { workspaceId: ctx.workspaceId, inboxId, status: "ACTIVE" } });
    if (active) throw new UserError("This inbox sends for an active campaign — pause it first");
    const { count } = await db.inbox.deleteMany({ where: { id: id.parse(inboxId), workspaceId: ctx.workspaceId } });
    if (!count) throw new UserError("Inbox not found");
    return { ok: true as const, message: "Inbox disconnected" };
  });
}

async function ownWarmup(workspaceId: string, inboxId: string) {
  const w = await db.warmup.findFirst({ where: { inboxId: id.parse(inboxId), inbox: { workspaceId } } });
  if (!w) throw new UserError("Inbox not found");
  return w;
}

export async function setWarmup(inboxId: string, action: "start" | "pause") {
  return run(async () => {
    const ctx = await assertWorkspace("ADMIN");
    const w = await ownWarmup(ctx.workspaceId, inboxId);
    if (action === "start") {
      await db.warmup.update({ where: { id: w.id }, data: { status: "ACTIVE", startedAt: w.startedAt ?? new Date(), currentPerDay: Math.max(w.currentPerDay, 5) } });
      return { ok: true as const, message: "Warmup started" };
    }
    await db.warmup.update({ where: { id: w.id }, data: { status: "PAUSED" } });
    return { ok: true as const, message: "Warmup paused" };
  });
}

export async function configureWarmup(inboxId: string, input: { targetPerDay: number; rampIncrement: number }) {
  return run(async () => {
    const ctx = await assertWorkspace("ADMIN");
    const w = await ownWarmup(ctx.workspaceId, inboxId);
    const d = z.object({ targetPerDay: z.number().int().min(5).max(100), rampIncrement: z.number().int().min(1).max(10) }).parse(input);
    await db.warmup.update({ where: { id: w.id }, data: { ...d, currentPerDay: Math.min(w.currentPerDay, d.targetPerDay) } });
    return { ok: true as const, message: "Warmup limits saved" };
  });
}
