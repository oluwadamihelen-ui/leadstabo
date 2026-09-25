import { NextResponse, type NextRequest } from "next/server";
import { safeEqual } from "@/lib/crypto";
import { processDueSends } from "@/lib/services/campaign-engine";
import { advanceWarmups } from "@/lib/services/warmup";
import { syncAllInboxes } from "@/lib/services/mailbox-sync";

// Scheduler entrypoint for serverless deployments. Protect with CRON_SECRET.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sends = await processDueSends();
  const warmups = await advanceWarmups();
  const sync = await syncAllInboxes();
  return NextResponse.json({ ok: true, ...sends, ...warmups, ...sync });
}
