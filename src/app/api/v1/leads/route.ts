import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiAuth, apiError } from "@/lib/api-auth";
import { email, text } from "@/lib/validation";

const serialize = (l: { id: string; firstName: string; lastName: string; email: string; emailStatus: string; title: string | null; company: { name: string; domain: string } | null; location: string | null; linkedinUrl: string | null; createdAt: Date }) => ({
  id: l.id,
  firstName: l.firstName,
  lastName: l.lastName,
  email: l.email,
  emailStatus: l.emailStatus,
  title: l.title,
  company: l.company ? { name: l.company.name, domain: l.company.domain } : null,
  location: l.location,
  linkedinUrl: l.linkedinUrl,
  createdAt: l.createdAt,
});

export async function GET(req: NextRequest) {
  const auth = await apiAuth(req);
  if (auth instanceof NextResponse) return auth;
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 25));
  const cursor = sp.get("cursor") ?? undefined;
  const leads = await db.lead.findMany({
    where: { workspaceId: auth.workspaceId, ...(sp.get("status") ? { emailStatus: sp.get("status") as never } : {}), ...(sp.get("list") ? { lists: { some: { listId: sp.get("list")! } } } : {}) },
    include: { company: true },
    orderBy: { id: "asc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const more = leads.length > limit;
  const page = leads.slice(0, limit);
  return NextResponse.json({ data: page.map(serialize), nextCursor: more ? page[page.length - 1].id : null });
}

const createSchema = z.object({
  email,
  firstName: text(80).pipe(z.string().min(1, "firstName is required")),
  lastName: text(80).optional(),
  title: text(120).optional(),
  company: text(120).optional(),
  location: text(120).optional(),
  linkedinUrl: z.string().url().max(300).optional(),
  listId: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await apiAuth(req);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(422, parsed.error.issues[0]?.message ?? "Invalid body");
  const d = parsed.data;
  const w = auth.workspaceId;
  if (d.listId && !(await db.leadList.findFirst({ where: { id: d.listId, workspaceId: w } }))) return apiError(404, "List not found");
  const domain = d.email.split("@")[1];
  const company = d.company
    ? await db.company.upsert({ where: { workspaceId_domain: { workspaceId: w, domain } }, create: { workspaceId: w, name: d.company, domain, website: `https://${domain}` }, update: {} })
    : null;
  const existing = await db.lead.findUnique({ where: { workspaceId_email: { workspaceId: w, email: d.email } } });
  if (existing) return apiError(409, "A lead with this email already exists");
  const lead = await db.lead.create({
    data: {
      workspaceId: w,
      email: d.email,
      firstName: d.firstName,
      lastName: d.lastName ?? "",
      title: d.title,
      location: d.location,
      linkedinUrl: d.linkedinUrl,
      companyId: company?.id,
      source: "api",
      activities: { create: { type: "added", description: "Added via API" } },
      ...(d.listId ? { lists: { create: { listId: d.listId } } } : {}),
    },
    include: { company: true },
  });
  return NextResponse.json({ data: serialize(lead) }, { status: 201 });
}
