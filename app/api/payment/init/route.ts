import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  updateSession,
  restoreSession,
  encodeSessionToken,
} from "@/lib/session";
import { createWhopPayment } from "@/lib/whop-multi";
import { resolveMerchant } from "@/lib/resolve-merchant";

export async function POST(req: NextRequest) {
  try {
    const merchant = await resolveMerchant();
    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 }
      );
    }

    const {
      sessionId,
      sessionToken,
      email,
      phone,
      shippingAddress,
      shippingMethod,
      shippingCost,
    } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      );
    }

    let session = getSession(sessionId);
    if (!session && sessionToken) {
      session = restoreSession(sessionToken) || undefined;
    }
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Save customer info
    updateSession(sessionId, {
      ...(email && { email }),
      ...(phone && { phone }),
      ...(shippingAddress && { shippingAddress }),
      ...(shippingMethod && { shippingMethod }),
      ...(shippingCost !== undefined && { shippingCost }),
    });

    const updated = getSession(sessionId)!;
    const totalWithShipping = updated.subtotal + updated.shippingCost;

    const baseUrl = req.nextUrl.origin;
    const redirectUrl = `${baseUrl}/confirmation?sessionId=${sessionId}`;

    const payment = await createWhopPayment(
      merchant,
      totalWithShipping,
      updated.currency,
      {
        sessionId: updated.id,
        email: updated.email || "",
        storeId: updated.storeId,
      },
      redirectUrl
    );

    updateSession(sessionId, {
      paymentIntentId: payment.checkoutSessionId,
      paymentStatus: "processing",
    });

    return NextResponse.json({
      checkoutSessionId: payment.checkoutSessionId,
      purchaseUrl: payment.purchaseUrl,
      planId: payment.planId,
      sessionToken: encodeSessionToken(getSession(sessionId)!),
    });
  } catch (err: any) {
    console.error("Payment creation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create payment" },
      { status: 500 }
    );
  }
}
