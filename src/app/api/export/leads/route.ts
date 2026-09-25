import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/auth/guard";

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Neutralise spreadsheet formula injection and quote.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(req: NextRequest) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const where: Prisma.LeadWhereInput = { workspaceId: ctx.workspaceId };
  const ids = sp.get("ids");
  if (ids) where.id = { in: ids.split(",").slice(0, 5000) };
  const list = sp.get("list");
  if (list) where.lists = { some: { listId: list } };
  const status = sp.get("status");
  if (status) where.emailStatus = status as Prisma.LeadWhereInput["emailStatus"];

  const leads = await db.lead.findMany({ where, include: { company: true }, orderBy: { createdAt: "desc" }, take: 10000 });
  const header = ["first_name", "last_name", "email", "email_status", "title", "seniority", "department", "company", "company_domain", "industry", "company_size", "location", "linkedin_url"];
  const lines = [header.join(",")].concat(
    leads.map((l) =>
      [l.firstName, l.lastName, l.email, l.emailStatus, l.title, l.seniority, l.department, l.company?.name, l.company?.domain, l.industry, l.company?.size, l.location, l.linkedinUrl]
        .map(esc)
        .join(","),
    ),
  );
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leadstabo-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
