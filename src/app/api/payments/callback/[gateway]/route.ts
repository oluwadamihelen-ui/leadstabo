import { NextResponse, type NextRequest } from "next/server";
import { fulfillPayment } from "@/lib/services/billing";

// Where the gateway sends the customer after checkout. We always re-verify with the
// gateway's API before granting anything — the query string alone is never trusted.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  // Paystack: reference/trxref · Flutterwave: tx_ref · Korapay: reference
  const reference = sp.get("reference") ?? sp.get("trxref") ?? sp.get("tx_ref") ?? "";
  const back = new URL("/settings/billing", process.env.APP_URL || req.url);
  if (!reference) {
    back.searchParams.set("payment", "failed");
    return NextResponse.redirect(back);
  }
  let result: Awaited<ReturnType<typeof fulfillPayment>> = "pending";
  try {
    result = await fulfillPayment(reference);
  } catch (e) {
    console.error("[payments] callback verify failed", e);
  }
  back.searchParams.set("payment", result === "unknown" ? "failed" : result);
  return NextResponse.redirect(back);
}
