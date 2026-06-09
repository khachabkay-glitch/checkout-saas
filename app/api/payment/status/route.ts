import { NextRequest, NextResponse } from "next/server";
import { verifyWhopPayment } from "@/lib/whop";
import { getMerchantByStoreId } from "@/lib/merchant";

export async function POST(req: NextRequest) {
  try {
    const { checkoutSessionId, storeId } = await req.json();
    if (!checkoutSessionId) return NextResponse.json({ error: "Missing checkoutSessionId" }, { status: 400 });

    let merchantConfig;
    if (storeId) {
      const merchant = await getMerchantByStoreId(storeId);
      if (merchant) {
        merchantConfig = { whop_api_key: merchant.whop_api_key, whop_company_id: merchant.whop_company_id };
      }
    }

    const result = await verifyWhopPayment(checkoutSessionId, undefined, merchantConfig);
    return NextResponse.json({ paid: result.paid, membershipId: result.membershipId });
  } catch (err: any) {
    console.error("Payment status check error:", err);
    return NextResponse.json({ paid: false, error: err.message });
  }
}
