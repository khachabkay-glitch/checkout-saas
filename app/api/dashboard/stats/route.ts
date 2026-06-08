import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase";

async function getMerchantFromRequest(req: NextRequest) {
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

    // Total orders
    const { count: totalOrders } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("merchant_id", merchantId);

    // Revenue this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: monthOrders } = await supabase
      .from("orders")
      .select("total")
      .eq("merchant_id", merchantId)
      .gte("created_at", startOfMonth);

    const revenueThisMonth = (monthOrders || []).reduce(
      (sum: number, o: { total: number }) => sum + (Number(o.total) || 0),
      0
    );

    // Total revenue
    const { data: allOrders } = await supabase
      .from("orders")
      .select("total")
      .eq("merchant_id", merchantId);

    const totalRevenue = (allOrders || []).reduce(
      (sum: number, o: { total: number }) => sum + (Number(o.total) || 0),
      0
    );

    return NextResponse.json({
      total_orders: totalOrders || 0,
      revenue_this_month: revenueThisMonth,
      total_revenue: totalRevenue,
    });
  } catch (err: any) {
    console.error("Dashboard stats error:", err);
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 }
    );
  }
}
