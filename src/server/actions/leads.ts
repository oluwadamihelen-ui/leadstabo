"use server";

import { z } from "zod";
import type { EmailStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { assertWorkspace } from "@/lib/auth/guard";
import { leadDatabase, verificationProvider } from "@/lib/providers";
import type { ProspectRecord } from "@/lib/providers/types";
import { CREDIT_COSTS, spendCredits } from "@/lib/services/credits";
import { notify } from "@/lib/services/notifications";
import { email as emailSchema, id, ids, requiredText, text } from "@/lib/validation";
import { run, UserError, type ActionResult } from "../action";

const externalIds = z.array(z.string().regex(/^[A-Za-z0-9_-]{1,64}$/)).min(1, "Select at least one lead").max(1000);

/** Upserts provider prospects into the workspace (company + lead). Returns lead ids by externalId. */
async function saveProspects(workspaceId: string, records: ProspectRecord[]) {
  const out = new Map<string, string>();
  for (const p of records) {
    const domain = p.company.domain || p.email.split("@")[1];
    const company = await db.company.upsert({
      where: { workspaceId_domain: { workspaceId, domain } },
      create: {
        workspaceId,
        name: p.company.name || domain,
        domain,
        website: `https://${domain}`,
        industry: p.company.industry,
        size: p.company.size,
        revenue: p.company.revenue,
        location: `${p.city}, ${p.country}`,
        country: p.country,
        description: p.company.description,
        technologies: p.company.technologies,
        linkedinUrl: p.company.linkedinUrl,
        founded: p.company.founded || null,
      },
      update: {},
    });
    const lead = await db.lead.upsert({
      where: { workspaceId_email: { workspaceId, email: p.email } },
      create: {
        workspaceId,
        companyId: company.id,
        externalId: p.externalId,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        title: p.title,
        seniority: p.seniority,
        department: p.department,
        industry: p.company.industry,
        location: `${p.city}, ${p.country}`,
        country: p.country,
        linkedinUrl: p.linkedinUrl,
        keywords: p.keywords,
        source: "lead_database",
        activities: { create: { type: "added", description: "Added from lead database" } },
      },
      update: {},
    });
    out.set(p.externalId, lead.id);
  }
  return out;
}

const ENRICHMENT_CACHE_DAYS = 90;

/**
 * Enrichment is the same person for every workspace, so we only pay the provider once per person:
 * check the shared cache first, and only call the lead database for ids nobody has fetched
 * recently. Each workspace is still billed its usual credit for every lead it reveals — this only
 * cuts what we pay Apollo, not what the customer is charged.
 */
async function revealViaCache(extIds: string[]): Promise<ProspectRecord[]> {
  const cutoff = new Date(Date.now() - ENRICHMENT_CACHE_DAYS * 86_400_000);
  const cached = await db.leadEnrichmentCache.findMany({ where: { externalId: { in: extIds }, fetchedAt: { gte: cutoff } } });
  const cachedIds = new Set(cached.map((c) => c.externalId));
  const missing = extIds.filter((x) => !cachedIds.has(x));
  const fresh = missing.length ? await leadDatabase().getByIds(missing) : [];
  if (fresh.length) {
    await db.$transaction(
      fresh.map((r) => db.leadEnrichmentCache.upsert({ where: { externalId: r.externalId }, create: { externalId: r.externalId, payload: r as object }, update: { payload: r as object, fetchedAt: new Date() } })),
    );
  }
  return [...cached.map((c) => c.payload as unknown as ProspectRecord), ...fresh];
}

async function revealInternal(workspaceId: string, extIds: string[]) {
  const existing = await db.lead.findMany({ where: { workspaceId, externalId: { in: extIds } }, select: { externalId: true, id: true } });
  const have = new Set(existing.map((e) => e.externalId));
  const toReveal = extIds.filter((x) => !have.has(x));
  if (toReveal.length) {
    // Check the balance up front; charge only for leads that actually came back with an email.
    const bal = await db.creditBalance.findUnique({ where: { workspaceId } });
    if ((bal?.balance ?? 0) < toReveal.length * CREDIT_COSTS.LEAD_REVEAL) throw new UserError(`Not enough credits — this needs ${toReveal.length}. Top up in Billing.`);
  }
  const records = toReveal.length ? (await revealViaCache(toReveal)).filter((r) => r.email) : [];
  if (records.length) {
    await spendCredits(workspaceId, records.length * CREDIT_COSTS.LEAD_REVEAL, "LEAD_DISCOVERY", `Revealed ${records.length} lead${records.length === 1 ? "" : "s"}`);
  }
  const saved = await saveProspects(workspaceId, records);
  const all = new Map(existing.map((e) => [e.externalId!, e.id]));
  for (const [k, v] of saved) all.set(k, v);
  return { leadIds: Array.from(all.values()), revealed: records.length, missing: toReveal.length - records.length };
}

export async function addProspectsToList(input: { externalIds: string[]; listId?: string; newListName?: string }): Promise<ActionResult<{ listId: string }>> {
  return run<{ listId: string }>(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const ext = externalIds.parse(input.externalIds);
    let listId = input.listId ? id.parse(input.listId) : undefined;
    if (listId) {
      const list = await db.leadList.findFirst({ where: { id: listId, workspaceId: ctx.workspaceId } });
      if (!list) throw new UserError("List not found");
    } else {
      const name = requiredText("List name", 80).parse(input.newListName ?? "");
      listId = (await db.leadList.create({ data: { workspaceId: ctx.workspaceId, name } })).id;
    }
    const { leadIds, revealed, missing } = await revealInternal(ctx.workspaceId, ext);
    if (!leadIds.length) throw new UserError("No email could be found for the selected leads — no credits were used");
    await db.leadListMember.createMany({ data: leadIds.map((leadId) => ({ listId: listId!, leadId })), skipDuplicates: true });
    return {
      ok: true,
      data: { listId },
      message: `${leadIds.length} lead${leadIds.length === 1 ? "" : "s"} added${revealed ? ` · ${revealed} credit${revealed === 1 ? "" : "s"} used` : ""}${missing ? ` · ${missing} had no email (not charged)` : ""}`,
    };
  });
}

export async function saveProspectsToLeads(input: { externalIds: string[] }): Promise<ActionResult<{ leadIds: string[] }>> {
  return run<{ leadIds: string[] }>(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const { leadIds, revealed } = await revealInternal(ctx.workspaceId, externalIds.parse(input.externalIds));
    return { ok: true, data: { leadIds }, message: `${leadIds.length} saved to All Leads${revealed ? ` · ${revealed} credits used` : ""}` };
  });
}

async function verifyInternal(workspaceId: string, leadIds: string[], label: string) {
  const leads = await db.lead.findMany({ where: { workspaceId, id: { in: leadIds } } });
  if (!leads.length) throw new UserError("No leads to verify");
  await spendCredits(workspaceId, leads.length * CREDIT_COSTS.VERIFICATION, "EMAIL_VERIFICATION", `Verified ${leads.length} email${leads.length === 1 ? "" : "s"}`);
  const runRow = await db.verificationRun.create({ data: { workspaceId, label, total: leads.length, status: "RUNNING" } });
  const tally: Record<string, number> = { VALID: 0, INVALID: 0, RISKY: 0, UNKNOWN: 0, CATCH_ALL: 0 };
  const provider = verificationProvider();
  for (const l of leads) {
    let res;
    try {
      res = await provider.verify(l.email);
    } catch (e) {
      res = { email: l.email, status: "UNKNOWN" as const, score: 0, reason: `Verification service error: ${e instanceof Error ? e.message.slice(0, 80) : "unknown"}` };
    }
    tally[res.status]++;
    await db.lead.update({ where: { id: l.id }, data: { emailStatus: res.status, verifiedAt: new Date() } });
    await db.leadActivity.create({ data: { leadId: l.id, type: "verified", description: `Email verified: ${res.status.toLowerCase().replace("_", "-")} (${res.reason})` } });
  }
  await db.verificationRun.update({
    where: { id: runRow.id },
    data: {
      processed: leads.length,
      valid: tally.VALID,
      invalid: tally.INVALID,
      risky: tally.RISKY,
      unknown: tally.UNKNOWN,
      catchAll: tally.CATCH_ALL,
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });
  await notify(workspaceId, {
    type: "VERIFICATION_COMPLETED",
    title: "Verification completed",
    body: `${leads.length} emails verified — ${tally.VALID} valid, ${tally.CATCH_ALL} catch-all, ${tally.RISKY} risky, ${tally.INVALID} invalid.`,
    href: "/leadgen/verify",
  });
  return tally;
}

export async function verifyProspects(input: { externalIds: string[] }) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const { leadIds } = await revealInternal(ctx.workspaceId, externalIds.parse(input.externalIds));
    const t = await verifyInternal(ctx.workspaceId, leadIds, "Lead search");
    return { ok: true as const, message: `Verified ${leadIds.length}: ${t.VALID} valid, ${t.INVALID} invalid` };
  });
}

export async function verifyLeads(input: { leadIds?: string[]; listId?: string; onlyUnverified?: boolean }) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const where: Prisma.LeadWhereInput = { workspaceId: ctx.workspaceId };
    if (input.leadIds) where.id = { in: ids.parse(input.leadIds) };
    if (input.listId) where.lists = { some: { listId: id.parse(input.listId) } };
    if (input.onlyUnverified) where.emailStatus = "UNVERIFIED";
    const leads = await db.lead.findMany({ where, select: { id: true } });
    if (!leads.length) return { ok: false as const, error: "No matching leads need verification" };
    let label = "Selected leads";
    if (input.listId) label = (await db.leadList.findFirst({ where: { id: input.listId, workspaceId: ctx.workspaceId } }))?.name ?? label;
    else if (input.onlyUnverified) label = "All unverified leads";
    const t = await verifyInternal(ctx.workspaceId, leads.map((l) => l.id), label);
    return { ok: true as const, message: `Verified ${leads.length}: ${t.VALID} valid, ${t.CATCH_ALL} catch-all, ${t.INVALID} invalid` };
  });
}

// ── Lists ────────────────────────────────────────────────────────────────

export async function createList(input: { name: string; description?: string }): Promise<ActionResult<{ id: string }>> {
  return run<{ id: string }>(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const list = await db.leadList.create({
      data: { workspaceId: ctx.workspaceId, name: requiredText("Name", 80).parse(input.name), description: text(300).parse(input.description ?? "") || null },
    });
    return { ok: true, data: { id: list.id }, message: "List created" };
  });
}

async function ownList(workspaceId: string, listId: string) {
  const list = await db.leadList.findFirst({ where: { id: id.parse(listId), workspaceId } });
  if (!list) throw new UserError("List not found");
  return list;
}

export async function renameList(listId: string, name: string) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    await ownList(ctx.workspaceId, listId);
    await db.leadList.update({ where: { id: listId }, data: { name: requiredText("Name", 80).parse(name) } });
    return { ok: true as const, message: "List renamed" };
  });
}

export async function duplicateList(listId: string) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const list = await ownList(ctx.workspaceId, listId);
    const members = await db.leadListMember.findMany({ where: { listId }, select: { leadId: true } });
    await db.leadList.create({
      data: { workspaceId: ctx.workspaceId, name: `${list.name} (copy)`, description: list.description, members: { create: members } },
    });
    return { ok: true as const, message: "List duplicated" };
  });
}

export async function deleteList(listId: string) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    await ownList(ctx.workspaceId, listId);
    await db.leadList.delete({ where: { id: listId } });
    return { ok: true as const, message: "List deleted" };
  });
}

export async function addLeadsToList(input: { leadIds: string[]; listId?: string; newListName?: string }) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const leadIds = ids.parse(input.leadIds);
    let listId = input.listId;
    if (listId) await ownList(ctx.workspaceId, listId);
    else listId = (await db.leadList.create({ data: { workspaceId: ctx.workspaceId, name: requiredText("List name", 80).parse(input.newListName ?? "") } })).id;
    const valid = await db.lead.findMany({ where: { workspaceId: ctx.workspaceId, id: { in: leadIds } }, select: { id: true } });
    await db.leadListMember.createMany({ data: valid.map((l) => ({ listId: listId!, leadId: l.id })), skipDuplicates: true });
    return { ok: true as const, message: `${valid.length} lead${valid.length === 1 ? "" : "s"} added to list` };
  });
}

export async function removeLeadsFromList(listId: string, leadIds: string[]) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    await ownList(ctx.workspaceId, listId);
    const { count } = await db.leadListMember.deleteMany({ where: { listId, leadId: { in: ids.parse(leadIds) } } });
    return { ok: true as const, message: `Removed ${count} from list` };
  });
}

// ── Leads ────────────────────────────────────────────────────────────────

export async function deleteLeads(leadIds: string[]) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const { count } = await db.lead.deleteMany({ where: { workspaceId: ctx.workspaceId, id: { in: ids.parse(leadIds) } } });
    return { ok: true as const, message: `Deleted ${count} lead${count === 1 ? "" : "s"}` };
  });
}

const leadEdit = z.object({
  firstName: requiredText("First name", 80),
  lastName: text(80),
  email: emailSchema,
  title: text(120),
  phone: text(40),
  location: text(120),
  linkedinUrl: z.union([z.literal(""), z.string().url().max(300)]),
});

export async function updateLead(leadId: string, input: z.input<typeof leadEdit>) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const lead = await db.lead.findFirst({ where: { id: id.parse(leadId), workspaceId: ctx.workspaceId } });
    if (!lead) throw new UserError("Lead not found");
    const d = leadEdit.parse(input);
    const emailChanged = d.email !== lead.email;
    await db.lead.update({
      where: { id: lead.id },
      data: { ...d, linkedinUrl: d.linkedinUrl || null, phone: d.phone || null, ...(emailChanged ? { emailStatus: "UNVERIFIED" as EmailStatus, verifiedAt: null } : {}) },
    });
    return { ok: true as const, message: emailChanged ? "Lead saved — email changed, re-verify before sending" : "Lead saved" };
  });
}

export async function createLead(input: z.input<typeof leadEdit> & { company?: string; listId?: string }): Promise<ActionResult<{ id: string }>> {
  return run<{ id: string }>(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const d = leadEdit.parse(input);
    if (await db.lead.findUnique({ where: { workspaceId_email: { workspaceId: ctx.workspaceId, email: d.email } } })) {
      return { ok: false, error: "A lead with this email already exists" };
    }
    const companyName = text(120).parse(input.company ?? "");
    const domain = d.email.split("@")[1];
    const company = companyName
      ? await db.company.upsert({
          where: { workspaceId_domain: { workspaceId: ctx.workspaceId, domain } },
          create: { workspaceId: ctx.workspaceId, name: companyName, domain, website: `https://${domain}` },
          update: {},
        })
      : null;
    const lead = await db.lead.create({
      data: {
        workspaceId: ctx.workspaceId,
        ...d,
        linkedinUrl: d.linkedinUrl || null,
        phone: d.phone || null,
        companyId: company?.id,
        source: "manual",
        activities: { create: { type: "added", description: "Added manually" } },
      },
    });
    if (input.listId) {
      await ownList(ctx.workspaceId, input.listId);
      await db.leadListMember.create({ data: { listId: input.listId, leadId: lead.id } });
    }
    return { ok: true, data: { id: lead.id }, message: "Lead added" };
  });
}

export async function addLeadNote(leadId: string, body: string) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const lead = await db.lead.findFirst({ where: { id: id.parse(leadId), workspaceId: ctx.workspaceId } });
    if (!lead) throw new UserError("Lead not found");
    const note = requiredText("Note", 5000).parse(body);
    await db.leadNote.create({ data: { leadId: lead.id, authorId: ctx.user.id, body: note } });
    await db.leadActivity.create({ data: { leadId: lead.id, type: "note", description: `${ctx.user.name} added a note` } });
    return { ok: true as const, message: "Note added" };
  });
}

export async function deleteLeadNote(noteId: string) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    const { count } = await db.leadNote.deleteMany({ where: { id: id.parse(noteId), lead: { workspaceId: ctx.workspaceId } } });
    if (!count) throw new UserError("Note not found");
    return { ok: true as const, message: "Note deleted" };
  });
}

// ── CSV import ───────────────────────────────────────────────────────────

function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (q) {
      if (c === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

export async function importLeadsCsv(input: { csv: string; listName: string; verify: boolean }) {
  return run(async () => {
    const ctx = await assertWorkspace("MEMBER");
    if (input.csv.length > 2_000_000) throw new UserError("File too large (2MB max)");
    const listName = requiredText("List name", 80).parse(input.listName);
    const rows = parseCsv(input.csv);
    if (rows.length < 2) throw new UserError("CSV needs a header row and at least one lead");
    const header = rows[0].map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
    const col = (...names: string[]) => header.findIndex((h) => names.includes(h));
    const ci = {
      email: col("email", "emailaddress", "workemail"),
      first: col("firstname", "first", "givenname"),
      last: col("lastname", "last", "surname"),
      name: col("name", "fullname"),
      title: col("title", "jobtitle", "position"),
      company: col("company", "companyname", "organization"),
      location: col("location", "city", "country"),
    };
    if (ci.email < 0) throw new UserError("CSV must include an 'email' column");
    const list = await db.leadList.create({ data: { workspaceId: ctx.workspaceId, name: listName, description: "Imported from CSV" } });
    let created = 0;
    let skipped = 0;
    const leadIds: string[] = [];
    for (const r of rows.slice(1, 5001)) {
      const parsed = emailSchema.safeParse(r[ci.email] ?? "");
      if (!parsed.success) {
        skipped++;
        continue;
      }
      const em = parsed.data;
      const full = ci.name >= 0 ? (r[ci.name] ?? "").trim().split(/\s+/) : [];
      const firstName = (ci.first >= 0 ? r[ci.first] : full[0])?.trim().slice(0, 80) || em.split("@")[0];
      const lastName = (ci.last >= 0 ? r[ci.last] : full.slice(1).join(" "))?.trim().slice(0, 80) ?? "";
      const companyName = ci.company >= 0 ? (r[ci.company] ?? "").trim().slice(0, 120) : "";
      const domain = em.split("@")[1];
      const company = companyName
        ? await db.company.upsert({
            where: { workspaceId_domain: { workspaceId: ctx.workspaceId, domain } },
            create: { workspaceId: ctx.workspaceId, name: companyName, domain, website: `https://${domain}` },
            update: {},
          })
        : null;
      const existing = await db.lead.findUnique({ where: { workspaceId_email: { workspaceId: ctx.workspaceId, email: em } } });
      const lead =
        existing ??
        (await db.lead.create({
          data: {
            workspaceId: ctx.workspaceId,
            email: em,
            firstName,
            lastName,
            title: ci.title >= 0 ? (r[ci.title] ?? "").trim().slice(0, 120) || null : null,
            location: ci.location >= 0 ? (r[ci.location] ?? "").trim().slice(0, 120) || null : null,
            companyId: company?.id,
            source: "csv_import",
            activities: { create: { type: "added", description: "Imported from CSV" } },
          },
        }));
      if (!existing) created++;
      leadIds.push(lead.id);
    }
    await db.leadListMember.createMany({ data: leadIds.map((leadId) => ({ listId: list.id, leadId })), skipDuplicates: true });
    let verifiedMsg = "";
    if (input.verify && leadIds.length) {
      const t = await verifyInternal(ctx.workspaceId, leadIds, listName);
      verifiedMsg = ` · verified: ${t.VALID} valid, ${t.INVALID} invalid`;
    }
    return { ok: true as const, message: `Imported ${leadIds.length} (${created} new, ${skipped} skipped)${verifiedMsg}` };
  });
}
