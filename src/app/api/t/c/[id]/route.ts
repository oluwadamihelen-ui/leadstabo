import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyClick } from "@/lib/tracking";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const target = req.nextUrl.searchParams.get("u") ?? "";
  const sig = req.nextUrl.searchParams.get("s") ?? "";
  if (!verifyClick(id, target, sig)) return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  try {
    const email = await db.email.findUnique({ where: { id }, select: { id: true, workspaceId: true, campaignId: true, inboxId: true } });
    if (email) await db.emailEvent.create({ data: { workspaceId: email.workspaceId, emailId: email.id, campaignId: email.campaignId, inboxId: email.inboxId, type: "CLICKED" } });
  } catch {
    /* always redirect */
  }
  return NextResponse.redirect(target, 302);
}
