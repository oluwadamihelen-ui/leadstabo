import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiAuth, apiError } from "@/lib/api-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const lead = await db.lead.findFirst({
    where: { id, workspaceId: auth.workspaceId },
    include: { company: true, campaigns: { include: { campaign: { select: { id: true, name: true, status: true } } } }, lists: { include: { list: { select: { id: true, name: true } } } } },
  });
  if (!lead) return apiError(404, "Lead not found");
  return NextResponse.json({
    data: {
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      emailStatus: lead.emailStatus,
      title: lead.title,
      company: lead.company,
      lastContactedAt: lead.lastContactedAt,
      lastRepliedAt: lead.lastRepliedAt,
      campaigns: lead.campaigns.map((c) => ({ ...c.campaign, leadStatus: c.status })),
      lists: lead.lists.map((l) => l.list),
    },
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const { count } = await db.lead.deleteMany({ where: { id, workspaceId: auth.workspaceId } });
  if (!count) return apiError(404, "Lead not found");
  return new NextResponse(null, { status: 204 });
}
