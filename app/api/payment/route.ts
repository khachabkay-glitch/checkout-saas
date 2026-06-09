import { NextRequest, NextResponse } from "next/server";
import { createWhopPayment } from "@/lib/whop";
import { getSession, updateSession, restoreSession, encodeSessionToken } from "@/lib/session";
import { getMerchantByStoreId } from "@/lib/merchant";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, sessionToken, email, phone, shippingAddress, shippingMethod, shippingCost } = await req.json();
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    let session = getSession(sessionId);
    if (!session && sessionToken) session = restoreSession(sessionToken) || undefined;
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    updateSession(sessionId, {
      ...(email && { email }),
      ...(phone && { phone }),
      ...(shippingAddress && { shippingAddress }),
      ...(shippingMethod && { shippingMethod }),
      ...(shippingCost !== undefined && { shippingCost }),
    });

    const updated = getSession(sessionId)!;
    const totalWithShipping = updated.subtotal + updated.shippingCost;
    const merchant = await getMerchantByStoreId(updated.storeId);
    const baseUrl = req.nextUrl.origin;
    const redirectUrl = baseUrl + "/confirmation?sessionId=" + sessionId;

    const payment = await createWhopPayment(
      totalWithShipping, updated.currency,
      { sessionId: updated.id, email: updated.email || "", storeId: updated.storeId },
      redirectUrl,
      merchant ? { whop_api_key: merchant.whop_api_key, whop_product_id: merchant.whop_product_id } : undefined
    );

    updateSession(sessionId, { paymentIntentId: payment.checkoutSessionId, paymentStatus: "processing" });
    return NextResponse.json({
      checkoutSessionId: payment.checkoutSessionId,
      purchaseUrl: payment.purchaseUrl,
      sessionToken: encodeSessionToken(getSession(sessionId)!),
    });
  } catch (err: any) {
    console.error("Payment creation error:", err);
    return NextResponse.json({ error: err.message || "Failed to create payment" }, { status: 500 });
  }
}
