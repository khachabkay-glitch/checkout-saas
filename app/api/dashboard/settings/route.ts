import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase";

async function getMerchantFromRequest(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await supabaseAuth.auth.getUser(token);
  if (!user?.email) return null;

  const db = getSupabaseServerClient();
  const { data: merchantUser } = await db
    .from("merchant_users")
    .select("merchant_id")
    .eq("email", user.email)
    .single();

  return merchantUser?.merchant_id || null;
}

export async function GET(req: NextRequest) {
  try {
    const merchantId = await getMerchantFromRequest(req);
    if (!merchantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    const { data: merchant, error } = await supabase
      .from("merchants")
      .select("*")
      .eq("id", merchantId)
      .single();

    if (error || !merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    // Mask sensitive fields
    return NextResponse.json({
      ...merchant,
      shopify_token: merchant.shopify_token ? "••••••••" : "",
      whop_api_key: merchant.whop_api_key ? "••••••••" : "",
    });
  } catch (err: any) {
    console.error("Settings GET error:", err);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

// Allowed fields that merchants can update
const ALLOWED_FIELDS = [
  "store_name",
  "custom_domain",
  "shopify_domain",
  "shopify_token",
  "whop_api_key",
  "whop_company_id",
  "whop_product_id",
  "logo_url",
  "brand_color",
  "accent_color",
  "store_url",
];

export async function PUT(req: NextRequest) {
  try {
    const merchantId = await getMerchantFromRequest(req);
    if (!merchantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Only allow whitelisted fields
    const updates: Record<string, string> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body && body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Add updated_at timestamp
    (updates as any).updated_at = new Date().toISOString();

    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from("merchants")
      .update(updates)
      .eq("id", merchantId);

    if (error) {
      console.error("Settings update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Settings PUT error:", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
