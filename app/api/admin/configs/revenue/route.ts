import { NextRequest, NextResponse } from "next/server";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;
const WHOP_BASE = "https://api.whop.com/api/v2";

function auth(req: NextRequest): boolean {
  return req.headers.get("x-admin-key") === ADMIN_PASSWORD;
}

export async function POST(req: NextRequest) {
  if (!auth(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { api_key } = await req.json();
  if (!api_key)
    return NextResponse.json(
      { error: "API key required" },
      { status: 400 }
    );

  try {
    const allPayments: any[] = [];
    let page = 1;
    let hasMore = true;

    // Paginate through payments (max 5 pages = 500 payments)
    while (hasMore && page <= 5) {
      const res = await fetch(
        `${WHOP_BASE}/payments?per=100&page=${page}`,
        { headers: { Authorization: `Bearer ${api_key}` } }
      );

      if (!res.ok) {
        if (page === 1) {
          const errText = await res.text();
          return NextResponse.json(
            {
              error: `Whop API error (${res.status})`,
              detail: errText,
            },
            { status: 502 }
          );
        }
        break;
      }

      const data = await res.json();
      const payments = data.data || [];
      allPayments.push(...payments);

      hasMore = payments.length === 100;
      page++;
    }

    // Calculate revenue
    const now = new Date();
    const thirtyDaysAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000
    );

    let totalRevenue = 0;
    let last30dRevenue = 0;
    let totalOrders = 0;
    let last30dOrders = 0;
    let currency = "EUR";

    for (const p of allPayments) {
      const isPaid =
        p.status === "paid" ||
        p.status === "completed" ||
        p.status === "complete";
      if (!isPaid) continue;

      // Whop returns amounts in full currency units (e.g. 99.9 = €99.90)
      const rawAmount = p.final_amount ?? p.amount ?? p.total ?? 0;
      const amount =
        typeof rawAmount === "number" ? rawAmount : 0;

      if (p.currency) currency = p.currency.toUpperCase();

      totalRevenue += amount;
      totalOrders++;

      // Whop returns Unix timestamps in seconds — convert to ms
      const ts = p.created_at || p.created || 0;
      const createdAt = new Date(ts > 1e12 ? ts : ts * 1000);
      if (createdAt >= thirtyDaysAgo) {
        last30dRevenue += amount;
        last30dOrders++;
      }
    }

    return NextResponse.json({
      total_revenue: Math.round(totalRevenue * 100) / 100,
      last_30d_revenue: Math.round(last30dRevenue * 100) / 100,
      total_orders: totalOrders,
      last_30d_orders: last30dOrders,
      currency,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch revenue" },
      { status: 500 }
    );
  }
}
