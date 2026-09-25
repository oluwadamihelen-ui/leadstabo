"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { assertWorkspace } from "@/lib/auth/guard";
import { id, requiredText, text } from "@/lib/validation";
import { run, UserError } from "../action";

const lines = z.array(text(300)).max(10).transform((a) => a.filter(Boolean));

const icpSchema = z.object({
  name: requiredText("Name", 120),
  industry: requiredText("Industry", 120),
  location: requiredText("Location", 120),
  companySize: text(40),
  titles: lines,
  pains: lines,
  goals: lines,
  objections: lines,
});

const offerSchema = z.object({
  name: requiredText("Name", 120),
  pricing: requiredText("Pricing", 200),
  valueProp: requiredText("Value proposition", 1000),
  proof: text(500),
  cta: requiredText("Call to action", 300),
});

export async function saveIcp(icpId: string | null, input: z.input<typeof icpSchema>) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const d = icpSchema.parse(input);
    if (icpId) {
      const { count } = await db.icp.updateMany({ where: { id: id.parse(icpId), workspaceId: ctx.workspaceId }, data: { ...d, companySize: d.companySize || null } });
      if (!count) throw new UserError("ICP not found");
    } else await db.icp.create({ data: { ...d, companySize: d.companySize || null, workspaceId: ctx.workspaceId } });
    return { ok: true as const, message: icpId ? "ICP updated" : "ICP created" };
  });
}

export async function saveOffer(offerId: string | null, input: z.input<typeof offerSchema>) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const d = offerSchema.parse(input);
    if (offerId) {
      const { count } = await db.offer.updateMany({ where: { id: id.parse(offerId), workspaceId: ctx.workspaceId }, data: { ...d, proof: d.proof || null } });
      if (!count) throw new UserError("Offer not found");
    } else await db.offer.create({ data: { ...d, proof: d.proof || null, workspaceId: ctx.workspaceId } });
    return { ok: true as const, message: offerId ? "Offer updated" : "Offer created" };
  });
}

export async function duplicatePlaybookItem(kind: "icp" | "offer", itemId: string) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    if (kind === "icp") {
      const i = await db.icp.findFirst({ where: { id: id.parse(itemId), workspaceId: ctx.workspaceId } });
      if (!i) throw new UserError("Not found");
      await db.icp.create({
        data: { workspaceId: i.workspaceId, name: `${i.name} (copy)`, industry: i.industry, location: i.location, companySize: i.companySize, titles: i.titles, pains: i.pains, goals: i.goals, objections: i.objections },
      });
    } else {
      const o = await db.offer.findFirst({ where: { id: id.parse(itemId), workspaceId: ctx.workspaceId } });
      if (!o) throw new UserError("Not found");
      await db.offer.create({ data: { workspaceId: o.workspaceId, name: `${o.name} (copy)`, pricing: o.pricing, valueProp: o.valueProp, proof: o.proof, cta: o.cta } });
    }
    return { ok: true as const, message: "Duplicated" };
  });
}

export async function deletePlaybookItem(kind: "icp" | "offer", itemId: string) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const where = { id: id.parse(itemId), workspaceId: ctx.workspaceId };
    const { count } = kind === "icp" ? await db.icp.deleteMany({ where }) : await db.offer.deleteMany({ where });
    if (!count) throw new UserError("Not found");
    return { ok: true as const, message: "Deleted" };
  });
}
