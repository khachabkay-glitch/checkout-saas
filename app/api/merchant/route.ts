import { NextResponse } from "next/server";
import { resolveMerchant } from "@/lib/resolve-merchant";

export async function GET() {
  try {
    const merchant = await resolveMerchant();
    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 }
      );
    }

    // Return only public merchant info — never expose secrets
    return NextResponse.json({
      name: merchant.name,
      slug: merchant.slug,
      logo_url: merchant.logo_url,
      brand_color: merchant.brand_color,
      accent_color: merchant.accent_color,
      store_url: merchant.store_url,
      store_name: merchant.store_name || merchant.name,
    });
  } catch (err: any) {
    console.error("Merchant route error:", err);
    return NextResponse.json(
      { error: "Failed to load merchant config" },
      { status: 500 }
    );
  }
}
