import { NextRequest, NextResponse } from "next/server";
import { verifyWhopPayment } from "@/lib/whop-multi";
import { shopifyAdminFetch } from "@/lib/shopify-multi";
import { resolveMerchant } from "@/lib/resolve-merchant";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getMerchantById } from "@/lib/merchant";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  console.log("=== ORDER API CALLED ===");

  try {
    const body = await req.json();
    console.log("FULL BODY:", JSON.stringify(body));

    // Resolve merchant — first try from headers (middleware), then from session
    let merchant = await resolveMerchant();
    if (!merchant && body.sessionId) {
      const session = getSession(body.sessionId);
      if (session?.merchantId) {
        merchant = await getMerchantById(session.merchantId);
      }
    }
    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 }
      );
    }

    // Accept both flat format and nested format
    const email =
      body.email ||
      body.customerInfo?.email ||
      `noemail@${merchant.slug}.checkout`;
    const firstName =
      body.shippingAddress?.firstName ||
      body.customerInfo?.firstName ||
      "Guest";
    const lastName =
      body.shippingAddress?.lastName ||
      body.customerInfo?.lastName ||
      "Customer";
    const address1 =
      body.shippingAddress?.address1 ||
      body.customerInfo?.address ||
      "Unknown";
    const city =
      body.shippingAddress?.city || body.customerInfo?.city || "Unknown";
    const province =
      body.shippingAddress?.province || body.customerInfo?.state || "";
    const zip =
      body.shippingAddress?.zip || body.customerInfo?.zip || "00000";
    const country =
      body.shippingAddress?.country || body.customerInfo?.country || "DE";
    const phone = body.phone || "";
    const items = body.lineItems || body.cartItems || [];
    const shippingMethod = body.shippingMethod || {};
    const totalAmount = body.subtotal || body.totalAmount || 0;
    const shippingCost = body.shippingCost || 0;
    const paymentId = body.paymentId || "whop";
    const whopCheckoutSessionId = body.whopCheckoutSessionId || "";
    const internalSessionId = body.sessionId || "";
    const currency = body.currency || "EUR";

    console.log(
      "Resolved fields - email:",
      email,
      "items:",
      items.length,
      "subtotal:",
      totalAmount,
      "internalSessionId:",
      internalSessionId,
      "whopCheckoutSessionId:",
      whopCheckoutSessionId,
      "merchant:",
      merchant.slug
    );

    // Verify with Whop that payment was actually received before creating a paid order
    if (!internalSessionId && !whopCheckoutSessionId) {
      console.error("No session IDs provided — refusing to create order");
      return NextResponse.json(
        { error: "Missing payment verification" },
        { status: 400 }
      );
    }

    const verification = await verifyWhopPayment(
      merchant,
      internalSessionId,
      whopCheckoutSessionId
    );
    if (!verification.paid) {
      console.error("Whop payment not verified for sessions:", {
        internalSessionId,
        whopCheckoutSessionId,
      });
      return NextResponse.json(
        {
          error:
            "Payment not verified with Whop. If you were charged, please contact support.",
        },
        { status: 402 }
      );
    }
    console.log("Whop payment verified:", verification);

    // Build line items for Shopify
    const lineItems = items.map((item: any) => {
      const rawId = (item.variantId || item.variant_id || "")
        .toString()
        .replace(/\D/g, "");
      const variantId =
        rawId.length > 5 ? parseInt(rawId.slice(-13)) : 0;
      return {
        ...(variantId > 1000 ? { variant_id: variantId } : {}),
        title: item.productTitle || item.title || item.name || "Product",
        quantity: item.quantity || 1,
        price: (item.price || 0).toString(),
      };
    });

    const orderPayload = {
      order: {
        email,
        financial_status: "paid",
        send_receipt: true,
        send_fulfillment_receipt: true,
        note: `Paid via Whop (${paymentId}) | Merchant: ${merchant.slug}`,
        tags: "custom-checkout, whop-payment, checkout-saas",
        line_items:
          lineItems.length > 0
            ? lineItems
            : [
                {
                  title: "Order",
                  quantity: 1,
                  price: totalAmount.toString(),
                },
              ],
        customer: { first_name: firstName, last_name: lastName, email },
        shipping_address: {
          first_name: firstName,
          last_name: lastName,
          address1,
          city,
          province,
          zip,
          country_code: country,
          ...(phone.length > 5 ? { phone } : {}),
        },
        billing_address: {
          first_name: firstName,
          last_name: lastName,
          address1,
          city,
          province,
          zip,
          country_code: country,
        },
        shipping_lines: [
          {
            title: shippingMethod.title || "Standard",
            price: (shippingMethod.price || "0.00").toString(),
            code: shippingMethod.handle || "standard",
          },
        ],
        transactions: [
          {
            kind: "sale",
            status: "success",
            amount: (totalAmount + shippingCost).toFixed(2),
            currency,
          },
        ],
      },
    };

    console.log(
      "Creating Shopify order for:",
      email,
      "items:",
      lineItems.length,
      "merchant:",
      merchant.slug
    );

    // Create order in Shopify using merchant's credentials
    const res = await shopifyAdminFetch(merchant, "/orders.json", {
      method: "POST",
      body: JSON.stringify(orderPayload),
    });

    const data = await res.json();
    console.log("Shopify status:", res.status);

    if (!res.ok) {
      const errMsg =
        typeof data.errors === "string"
          ? data.errors
          : JSON.stringify(data.errors);
      console.error("Shopify ERROR:", errMsg);
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }

    const order = data.order;
    console.log("=== ORDER CREATED: #" + order.order_number + " ===");

    // Log order to Supabase for analytics
    try {
      const supabase = getSupabaseServerClient();
      await supabase.from("orders").insert({
        merchant_id: merchant.id,
        shopify_order_id: String(order.id),
        shopify_order_number: String(order.order_number),
        shopify_order_name: order.name,
        email,
        total: totalAmount + shippingCost,
        currency,
        status: "created",
      });
    } catch (logErr) {
      // Don't fail the order if logging fails
      console.error("Failed to log order to Supabase:", logErr);
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      orderName: order.name,
    });
  } catch (err: any) {
    console.error("=== ORDER EXCEPTION ===", err.message);
    // Never expose raw error details (especially HTML) to the client
    const safeMessage =
      (err.message || "").length > 200 || (err.message || "").includes("<")
        ? "An error occurred while creating the order. Payment was received — contact support if the order doesn't appear."
        : err.message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
