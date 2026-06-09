import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  getSession,
  updateSession,
  encodeSessionToken,
  restoreSession,
} from "@/lib/session";
import { createWhopPayment } from "@/lib/whop";
import { getMerchantByStoreId } from "@/lib/merchant";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.sessionToken) {
      const session = restoreSession(body.sessionToken);
      if (!session) {
        return NextResponse.json({ error: "Invalid session token" }, { status: 400 });
      }
      return NextResponse.json({
        sessionId: session.id,
        sessionToken: encodeSessionToken(session),
        cart: {
          lineItems: session.lineItems,
          subtotal: session.subtotal,
          total: session.total,
          currency: session.currency,
          discounts: session.discounts,
        },
      });
    }

    if (body.sessionId && (body.email || body.phone || body.shippingAddress)) {
      let session = getSession(body.sessionId);
      if (!session && body.sessionToken) {
        session = restoreSession(body.sessionToken) || undefined;
      }
      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      const updated = updateSession(body.sessionId, {
        ...(body.email && { email: body.email }),
        ...(body.phone && { phone: body.phone }),
        ...(body.shippingAddress && { shippingAddress: body.shippingAddress }),
        ...(body.shippingMethod && { shippingMethod: body.shippingMethod }),
        ...(body.shippingCost !== undefined && { shippingCost: body.shippingCost }),
      });
      return NextResponse.json({
        sessionId: updated!.id,
        sessionToken: encodeSessionToken(updated!),
        updated: true,
      });
    }

    const { cartData, storeId, country } = body;
    if (!cartData || !cartData.items || !cartData.items.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const resolvedStoreId = storeId || process.env.SHOPIFY_STORE_DOMAIN!;
    const currency = cartData.currency || "EUR";
    const lineItems = cartData.items.map((item: any) => {
      const quantity = item.quantity || 1;
      const originalPrice = (item.price || 0) / 100;
      const hasLinePrice = item.line_price !== undefined && item.line_price !== null;
      const effectiveLineTotal = hasLinePrice ? item.line_price / 100 : originalPrice * quantity;
      const effectiveUnitPrice = quantity > 0 ? effectiveLineTotal / quantity : 0;
      return {
        variantId: "gid://shopify/ProductVariant/" + item.variant_id,
        productTitle: item.product_title || "Product",
        variantTitle: item.variant_title || "",
        quantity,
        price: effectiveUnitPrice,
        originalPrice,
        currency,
        image: item.image || "",
        sku: item.sku || "",
        weight: item.grams || 0,
        weightUnit: "GRAMS",
        lineId: String(item.variant_id),
      };
    });

    const subtotal = lineItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    const session = createSession({
      storeId: resolvedStoreId,
      country: country || "DE",
      lineItems, subtotal, total: subtotal, currency, discounts: [],
    });

    const merchant = await getMerchantByStoreId(resolvedStoreId);
    let whopPlanId = "";
    let whopCheckoutSessionId = "";
    try {
      const baseUrl = req.nextUrl.origin;
      const payment = await createWhopPayment(
        subtotal, currency,
        { sessionId: session.id, storeId: session.storeId },
        baseUrl + "/confirmation?sessionId=" + session.id,
        merchant ? { whop_api_key: merchant.whop_api_key, whop_product_id: merchant.whop_product_id } : undefined
      );
      const match = payment.purchaseUrl.match(/checkout\/(plan_[^/?]+)/);
      if (match) whopPlanId = match[1];
      whopCheckoutSessionId = payment.checkoutSessionId;
      updateSession(session.id, { paymentIntentId: payment.checkoutSessionId, paymentStatus: "processing" });
    } catch (e) {
      console.error("Whop pre-create in session:", e);
    }

    return NextResponse.json({
      sessionId: session.id,
      sessionToken: encodeSessionToken(getSession(session.id) || session),
      whopPlanId, whopCheckoutSessionId,
      cart: { lineItems: session.lineItems, subtotal: session.subtotal, total: session.total, currency: session.currency, discounts: session.discounts },
    });
  } catch (err: any) {
    console.error("Session error:", err);
    return NextResponse.json({ error: err.message || "Failed to process session" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json({
    sessionId: session.id, sessionToken: encodeSessionToken(session),
    email: session.email, phone: session.phone,
    cart: { lineItems: session.lineItems, subtotal: session.subtotal, total: session.total, currency: session.currency, discounts: session.discounts },
    shippingAddress: session.shippingAddress, shippingMethod: session.shippingMethod, shippingCost: session.shippingCost, paymentStatus: session.paymentStatus,
  });
}
