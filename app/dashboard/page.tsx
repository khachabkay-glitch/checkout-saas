"use client";

import { useEffect, useState } from "react";
import { getAuthenticatedMerchant, type AuthenticatedMerchant } from "@/lib/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase";

interface DashboardStats {
  total_orders: number;
  revenue_this_month: number;
  total_revenue: number;
}

interface Order {
  id: string;
  shopify_order_id: string;
  shopify_order_number: string;
  shopify_order_name: string;
  email: string;
  total: number;
  currency: string;
  status: string;
  created_at: string;
}

export default function DashboardOverview() {
  const [merchant, setMerchant] = useState<AuthenticatedMerchant | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const m = await getAuthenticatedMerchant();
      if (!m) return;
      setMerchant(m);

      const supabase = getSupabaseBrowserClient();

      // Fetch total orders
      const { count: totalOrders } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("merchant_id", m.id);

      // Fetch revenue this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: monthOrders } = await supabase
        .from("orders")
        .select("total")
        .eq("merchant_id", m.id)
        .gte("created_at", startOfMonth);

      const revenueThisMonth = (monthOrders || []).reduce(
        (sum: number, o: { total: number }) => sum + (Number(o.total) || 0),
        0
      );

      // Fetch total revenue
      const { data: allOrders } = await supabase
        .from("orders")
        .select("total")
        .eq("merchant_id", m.id);

      const totalRevenue = (allOrders || []).reduce(
        (sum: number, o: { total: number }) => sum + (Number(o.total) || 0),
        0
      );

      setStats({
        total_orders: totalOrders || 0,
        revenue_this_month: revenueThisMonth,
        total_revenue: totalRevenue,
      });

      // Fetch recent orders
      const { data: recent } = await supabase
        .from("orders")
        .select("*")
        .eq("merchant_id", m.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setRecentOrders((recent as Order[]) || []);
      setLoading(false);
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  const setupChecklist = [
    {
      label: "Shopify connected",
      done: Boolean(merchant?.shopify_domain && merchant?.shopify_token),
    },
    {
      label: "Whop configured",
      done: Boolean(merchant?.whop_api_key && merchant?.whop_company_id && merchant?.whop_product_id),
    },
    {
      label: "Branding customized",
      done: Boolean(merchant?.logo_url || merchant?.brand_color !== "#111827"),
    },
    {
      label: "Custom domain set",
      done: Boolean(merchant?.custom_domain),
    },
  ];

  const completedSteps = setupChecklist.filter((s) => s.done).length;

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{merchant?.store_name ? `, ${merchant.store_name}` : ""}
        </h1>
        <p className="text-gray-500 mt-1">Here is what is happening with your store.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.total_orders || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Revenue This Month</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {new Intl.NumberFormat("en-EU", {
              style: "currency",
              currency: "EUR",
            }).format(stats?.revenue_this_month || 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Status</p>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                merchant?.active
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {merchant?.active ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {new Intl.NumberFormat("en-EU", {
              style: "currency",
              currency: "EUR",
            }).format(stats?.total_revenue || 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Total revenue</p>
        </div>
      </div>

      {/* Setup checklist */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Setup Progress</h3>
          <span className="text-xs text-gray-500">
            {completedSteps}/{setupChecklist.length} completed
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${(completedSteps / setupChecklist.length) * 100}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {setupChecklist.map((item) => (
            <div key={item.label} className="flex items-center gap-2.5">
              {item.done ? (
                <svg className="w-5 h-5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                </svg>
              )}
              <span className={`text-sm ${item.done ? "text-gray-700" : "text-gray-400"}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {completedSteps < setupChecklist.length && (
          <a
            href="/dashboard/setup"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium mt-4"
          >
            Complete setup
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        )}
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Recent Orders</h3>
            <a
              href="/dashboard/orders"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
            </a>
          </div>
        </div>

        {recentOrders.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500">No orders yet. They will appear here once customers start checking out.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Order</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Total</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3.5 text-sm font-medium text-gray-900">
                      {order.shopify_order_name || `#${order.shopify_order_number}`}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-500">{order.email}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-900">
                      {new Intl.NumberFormat("en-EU", {
                        style: "currency",
                        currency: order.currency || "EUR",
                      }).format(Number(order.total) || 0)}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          order.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : order.status === "refunded"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
