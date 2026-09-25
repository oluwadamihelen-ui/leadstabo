import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const auth = await apiAuth(req);
  if (auth instanceof NextResponse) return auth;
  const lists = await db.leadList.findMany({ where: { workspaceId: auth.workspaceId }, include: { _count: { select: { members: true } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: lists.map((l) => ({ id: l.id, name: l.name, description: l.description, leads: l._count.members, createdAt: l.createdAt })) });
}
