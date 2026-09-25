import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiAuth } from "@/lib/api-auth";
import { campaignFunnels } from "@/lib/services/analytics";

export async function GET(req: NextRequest) {
  const auth = await apiAuth(req);
  if (auth instanceof NextResponse) return auth;
  const [campaigns, f] = await Promise.all([
    db.campaign.findMany({ where: { workspaceId: auth.workspaceId }, orderBy: { createdAt: "desc" }, include: { _count: { select: { leads: true } } } }),
    campaignFunnels(auth.workspaceId),
  ]);
  return NextResponse.json({
    data: campaigns.map((c) => ({ id: c.id, name: c.name, status: c.status, leads: c._count.leads, createdAt: c.createdAt, launchedAt: c.launchedAt, stats: f(c.id) })),
  });
}
