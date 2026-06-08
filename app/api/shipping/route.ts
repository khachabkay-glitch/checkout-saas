import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  updateSession,
  restoreSession,
  encodeSessionToken,
} from "@/lib/session";
import { shopifyAdminFetch } from "@/lib/shopify-multi";
import { resolveMerchant } from "@/lib/resolve-merchant";

const FREE_SHIPPING_RATE = {
  handle: "free-shipping",
  title: "FREE Shipping Incl. Track & Trace",
  price: "0.00",
};
const FALLBACK_RATES = [FREE_SHIPPING_RATE];

async function getShopifyShippingRates(
  merchant: {
    shopify_domain: string;
    shopify_token: string;
    [key: string]: any;
  },
  country: string
) {
  try {
    const res = await shopifyAdminFetch(
      merchant as any,
      "/shipping_zones.json"
    );

    if (!res.ok) {
      console.error(
        "Shopify shipping zones error:",
        res.status,
        await res.text()
      );
      return null;
    }

    const { shipping_zones } = await res.json();
    const rates: { handle: string; title: string; price: string }[] = [];

    for (const zone of shipping_zones) {
      const countries = zone.countries || [];
      const match = countries.find(
        (c: any) => c.code === country || c.code === "*"
      );
      if (!match) continue;

      for (const rate of zone.price_based_shipping_rates || []) {
        rates.push({
          handle:
            rate.id?.toString() ||
            rate.name.toLowerCase().replace(/\s+/g, "-"),
          title: rate.name,
          price: rate.price,
        });
      }
      for (const rate of zone.weight_based_shipping_rates || []) {
        rates.push({
          handle:
            rate.id?.toString() ||
            rate.name.toLowerCase().replace(/\s+/g, "-"),
          title: rate.name,
          price: rate.price,
        });
      }
    }

    if (rates.length === 0) return null;
    // Always offer free shipping; prepend if Shopify didn't return a free rate explicitly.
    const hasFree = rates.some((r) => parseFloat(r.price) === 0);
    return hasFree ? rates : [FREE_SHIPPING_RATE, ...rates];
  } catch (err) {
    console.error("Shopify shipping zones fetch error:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const merchant = await resolveMerchant();
    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 }
      );
    }

    const { sessionId, sessionToken, address } = await req.json();

    if (!sessionId || !address) {
      return NextResponse.json(
        { error: "Missing sessionId or address" },
        { status: 400 }
      );
    }

    let session = getSession(sessionId);
    if (!session && sessionToken) {
      session = restoreSession(sessionToken) || undefined;
    }
    if (session) {
      session = updateSession(sessionId, { shippingAddress: address })!;
    }

    // Try Shopify first, fall back to defaults
    let rates = await getShopifyShippingRates(merchant, address.country);
    let fallback = false;
    if (!rates) {
      console.log(
        "Using fallback shipping rates for country:",
        address.country
      );
      rates = FALLBACK_RATES;
      fallback = true;
    }

    return NextResponse.json({
      rates,
      fallback,
      sessionToken: session ? encodeSessionToken(session) : undefined,
    });
  } catch (err: any) {
    console.error("Shipping rates error:", err);
    // Always return rates so the user can proceed
    return NextResponse.json({ rates: FALLBACK_RATES, fallback: true });
  }
}
