import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/auth/guard";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`search:${ctx.user.id}`, 120, 60_000).ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ results: [] });
  const w = ctx.workspaceId;
  const ci = { contains: q, mode: "insensitive" as const };

  const [leads, companies, campaigns, sequences, lessons, conversations] = await Promise.all([
    db.lead.findMany({
      where: { workspaceId: w, OR: [{ firstName: ci }, { lastName: ci }, { email: ci }, { title: ci }, { company: { name: ci } }] },
      include: { company: true },
      take: 6,
    }),
    db.company.findMany({ where: { workspaceId: w, OR: [{ name: ci }, { domain: ci }] }, take: 4 }),
    db.campaign.findMany({ where: { workspaceId: w, name: ci }, take: 4 }),
    db.sequence.findMany({ where: { workspaceId: w, name: ci }, take: 4 }),
    db.academyLesson.findMany({ where: { OR: [{ title: ci }, { summary: ci }] }, include: { module: true }, take: 5 }),
    db.conversation.findMany({
      where: { workspaceId: w, OR: [{ subject: ci }, { lead: { OR: [{ firstName: ci }, { lastName: ci }] } }] },
      include: { lead: true },
      take: 4,
    }),
  ]);

  return NextResponse.json({
    results: [
      ...leads.map((l) => ({ type: "lead", id: l.id, title: `${l.firstName} ${l.lastName}`, subtitle: [l.title, l.company?.name].filter(Boolean).join(" · "), href: `/leads/${l.id}` })),
      ...companies.map((c) => ({
        type: "company",
        id: c.id,
        title: c.name,
        subtitle: c.domain,
        href: `/leads?q=${encodeURIComponent(c.name)}`,
      })),
      ...campaigns.map((c) => ({ type: "campaign", id: c.id, title: c.name, subtitle: c.status.toLowerCase(), href: `/outreach/campaigns/${c.id}` })),
      ...sequences.map((s) => ({ type: "sequence", id: s.id, title: s.name, href: `/outreach/sequences/${s.id}` })),
      ...lessons.map((l) => ({ type: "lesson", id: l.id, title: l.title, subtitle: l.module.dayLabel, href: `/academy/learn/${l.slug}` })),
      ...conversations.map((c) => ({ type: "conversation", id: c.id, title: c.subject, subtitle: `${c.lead.firstName} ${c.lead.lastName}`, href: `/outreach/inbox?c=${c.id}` })),
    ],
  });
}
