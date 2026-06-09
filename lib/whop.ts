const WHOP_BASE = "https://api.whop.com/api/v2";

function getApiKey(merchantKey) {
  return merchantKey || process.env.WHOP_API_KEY || "";
}

function getProductId(merchantProductId) {
  return merchantProductId || process.env.WHOP_PRODUCT_ID || "";
}

function getCompanyId(merchantCompanyId) {
  return merchantCompanyId || process.env.WHOP_COMPANY_ID || "";
}

export async function createWhopPayment(
  amount,
  currency,
  metadata,
  redirectUrl,
  merchantConfig
) {
  const apiKey = getApiKey(merchantConfig?.whop_api_key);
  const productId = getProductId(merchantConfig?.whop_product_id);

  const res = await fetch(WHOP_BASE + "/checkout_sessions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      price: {
        product_id: productId,
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
    throw new Error("Whop API error (" + res.status + "): " + text);
  }

  const session = await res.json();
  return {
    checkoutSessionId: session.id,
    purchaseUrl: session.purchase_url,
    planId: session.plan_id,
  };
}

export async function submitWhopPayment(
  whopApiLocation,
  email,
  cardToken,
  billingAddress
) {
  await fetch(whopApiLocation, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const paymentBody = {
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
        "Payment failed (" + payRes.status + ")"
    );
  }
  return payData;
}

export async function verifyWhopPayment(
  internalSessionId,
  whopCheckoutSessionId,
  merchantConfig
) {
  if (!internalSessionId && !whopCheckoutSessionId) return { paid: false };

  const apiKey = getApiKey(merchantConfig?.whop_api_key);
  const companyId = getCompanyId(merchantConfig?.whop_company_id);

  try {
    const res = await fetch(WHOP_BASE + "/payments?per=50", {
      headers: { Authorization: "Bearer " + apiKey },
    });
    if (res.ok) {
      const data = await res.json();
      for (const p of data.data || []) {
        const metaSessionId = p?.metadata?.sessionId || p?.membership_metadata?.sessionId;
        const isPaid = p?.status === "paid" || p?.status === "completed" || p?.status === "complete";
        if (isPaid && (metaSessionId === internalSessionId || p?.checkout_id === whopCheckoutSessionId)) {
          return { paid: true, paymentId: p.id };
        }
      }
    }
  } catch (err) {
    console.error("Whop /payments check failed:", err);
  }

  if (companyId) {
    try {
      const res = await fetch(WHOP_BASE + "/memberships?company_id=" + companyId + "&per=50", {
        headers: { Authorization: "Bearer " + apiKey },
      });
      if (res.ok) {
        const data = await res.json();
        for (const m of data.data || []) {
          const metaSessionId = m?.metadata?.sessionId;
          const validStatus = m?.status === "completed" || m?.status === "active" || m?.valid === true;
          if (validStatus && (metaSessionId === internalSessionId || m?.checkout_session === whopCheckoutSessionId)) {
            return { paid: true, membershipId: m.id };
          }
        }
      }
    } catch (err) {
      console.error("Whop /memberships check failed:", err);
    }
  }

  return { paid: false };
}
