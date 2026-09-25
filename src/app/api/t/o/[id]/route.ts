import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

// 1×1 transparent GIF open-tracking pixel.
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const email = await db.email.findUnique({ where: { id }, select: { id: true, workspaceId: true, campaignId: true, inboxId: true, sentAt: true } });
    // Ignore fetches in the first few seconds (mail-server link scanners prefetch images).
    if (email?.sentAt && Date.now() - email.sentAt.getTime() > 5_000) {
      await db.emailEvent.create({ data: { workspaceId: email.workspaceId, emailId: email.id, campaignId: email.campaignId, inboxId: email.inboxId, type: "OPENED" } });
    }
  } catch {
    /* never fail the image */
  }
  return new NextResponse(GIF, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
}
