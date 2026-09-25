import { NextResponse, type NextRequest } from "next/server";
import { getGateway } from "@/lib/payments";
import { fulfillPayment } from "@/lib/services/billing";

// Server-to-server confirmation from Paystack, Flutterwave or Korapay. Covers customers
// who close the tab before being redirected back.
export async function POST(req: NextRequest, { params }: { params: Promise<{ gateway: string }> }) {
  const { gateway: key } = await params;
  const gateway = getGateway(key);
  if (!gateway || !gateway.live) return NextResponse.json({ error: "Unknown gateway" }, { status: 404 });
  const raw = await req.text();
  let parsed: { ok: boolean; reference?: string };
  try {
    parsed = gateway.parseWebhook(raw, req.headers);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }
  if (!parsed.ok) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  if (parsed.reference) {
    try {
      await fulfillPayment(parsed.reference);
    } catch (e) {
      console.error(`[payments] ${key} webhook`, e);
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
