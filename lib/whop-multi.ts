import { MerchantConfig } from "./merchant";

const WHOP_BASE = "https://api.whop.com/api/v2";

/**
 * Create a Whop checkout session using the merchant's Whop credentials.
 */
export async function createWhopPayment(
  merchant: MerchantConfig,
  amount: number,
  currency: string,
  metadata: Record<string, string>,
  redirectUrl: string
) {
  const res = await fetch(`${WHOP_BASE}/checkout_sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${merchant.whop_api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      price: {
        product_id: merchant.whop_product_id,
        plan_type: "one_time",
        currency: currency.toLowerCase(),
        initial_price: amount,
      },
      redirect_url: redirectUrl,
      metadata,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Whop API error (${res.status}): ${text}`);
  }

  const session = await res.json();

  return {
    checkoutSessionId: session.id as string,
    purchaseUrl: session.purchase_url as string,
    planId: session.plan_id as string,
  };
}

/**
 * Submit payment to Whop. This is merchant-agnostic — it uses the
 * Whop API location URL returned from the checkout session.
 */
export async function submitWhopPayment(
  whopApiLocation: string,
  email: string,
  cardToken: string,
  billingAddress?: { country: string; zip: string }
) {
  // Set email
  await fetch(whopApiLocation, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  // Submit card token
  const paymentBody: Record<string, unknown> = {
    payment_method: {
      processor: "multi_psp",
      method: "card",
      token: cardToken,
    },
  };

  if (billingAddress) {
    paymentBody.billing_address = {
      country: billingAddress.country.toLowerCase(),
      zip: billingAddress.zip,
    };
  }

  const payRes = await fetch(whopApiLocation, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(paymentBody),
  });

  const payData = await payRes.json();

  if (!payRes.ok) {
    throw new Error(
      payData?.errors?.general?.[0] ||
        payData?.error?.message ||
        `Payment failed (${payRes.status})`
    );
  }

  return payData;
}

/**
 * Verify that a payment was actually received by Whop.
 * Uses the merchant's whop_api_key and whop_company_id.
 */
export async function verifyWhopPayment(
  merchant: MerchantConfig,
  internalSessionId: string,
  whopCheckoutSessionId?: string
): Promise<{ paid: boolean; paymentId?: string; membershipId?: string }> {
  if (!internalSessionId && !whopCheckoutSessionId) return { paid: false };

  // 1. Check /payments — most authoritative
  try {
    const res = await fetch(`${WHOP_BASE}/payments?per=50`, {
      headers: { Authorization: `Bearer ${merchant.whop_api_key}` },
    });
    if (res.ok) {
      const data = await res.json();
      for (const p of data.data || []) {
        const metaSessionId =
          p?.metadata?.sessionId || p?.membership_metadata?.sessionId;
        const isPaid =
          p?.status === "paid" ||
          p?.status === "completed" ||
          p?.status === "complete";
        if (
          isPaid &&
          (metaSessionId === internalSessionId ||
            p?.checkout_id === whopCheckoutSessionId)
        ) {
          return { paid: true, paymentId: p.id };
        }
      }
    }
  } catch (err) {
    console.error("Whop /payments check failed:", err);
  }

  // 2. Check /memberships
  try {
    const res = await fetch(
      `${WHOP_BASE}/memberships?company_id=${merchant.whop_company_id}&per=50`,
      { headers: { Authorization: `Bearer ${merchant.whop_api_key}` } }
    );
    if (res.ok) {
      const data = await res.json();
      for (const m of data.data || []) {
        const metaSessionId = m?.metadata?.sessionId;
        const validStatus =
          m?.status === "completed" ||
          m?.status === "active" ||
          m?.valid === true;
        if (
          validStatus &&
          (metaSessionId === internalSessionId ||
            m?.checkout_session === whopCheckoutSessionId)
        ) {
          return { paid: true, membershipId: m.id };
        }
      }
    }
  } catch (err) {
    console.error("Whop /memberships check failed:", err);
  }

  return { paid: false };
}
