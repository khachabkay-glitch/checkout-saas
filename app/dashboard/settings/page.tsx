"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthenticatedMerchant } from "@/lib/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase";

interface MerchantData {
  id: string;
  store_name: string;
  store_url: string;
  shopify_domain: string;
  shopify_token: string;
  whop_api_key: string;
  whop_company_id: string;
  whop_product_id: string;
  brand_color: string;
  accent_color: string;
  logo_url: string;
  custom_domain: string;
}

const defaultMerchant: Omit<MerchantData, "id"> = {
  store_name: "",
  store_url: "",
  shopify_domain: "",
  shopify_token: "",
  whop_api_key: "",
  whop_company_id: "",
  whop_product_id: "",
  brand_color: "#000000",
  accent_color: "#4F46E5",
  logo_url: "",
  custom_domain: "",
};

export default function SettingsPage() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [form, setForm] = useState(defaultMerchant);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showShopifyToken, setShowShopifyToken] = useState(false);
  const [showWhopApiKey, setShowWhopApiKey] = useState(false);

  useEffect(() => {
    async function loadMerchant() {
      try {
        const data = await getAuthenticatedMerchant();
        if (!data) {
          router.push("/login");
          return;
        }
        setMerchant(data as MerchantData);
        setForm({
          store_name: data.store_name ?? "",
          store_url: data.store_url ?? "",
          shopify_domain: data.shopify_domain ?? "",
          shopify_token: data.shopify_token ?? "",
          whop_api_key: data.whop_api_key ?? "",
          whop_company_id: data.whop_company_id ?? "",
          whop_product_id: data.whop_product_id ?? "",
          brand_color: data.brand_color ?? "#000000",
          accent_color: data.accent_color ?? "#4F46E5",
          logo_url: data.logo_url ?? "",
          custom_domain: data.custom_domain ?? "",
        });
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    loadMerchant();
  }, [router]);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!merchant) return;

    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("merchants")
        .update({
          store_name: form.store_name,
          store_url: form.store_url,
          shopify_domain: form.shopify_domain,
          shopify_token: form.shopify_token,
          whop_api_key: form.whop_api_key,
          whop_company_id: form.whop_company_id,
          whop_product_id: form.whop_product_id,
          brand_color: form.brand_color,
          accent_color: form.accent_color,
          logo_url: form.logo_url,
          custom_domain: form.custom_domain,
        })
        .eq("id", merchant.id);

      if (error) {
        showToast("Failed to save settings: " + error.message, "error");
      } else {
        showToast("Settings saved successfully.", "success");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading settings...</div>
      </div>
    );
  }

  if (!merchant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-fade-in">
          <div
            className={"px-5 py-3 rounded-lg shadow-lg text-sm font-medium " + (toast.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200")}
          >
            {toast.message}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your store configuration and integrations.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          {/* Store Information */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-1">Store Information</h2>
            <p className="text-sm text-gray-500 mb-6">Basic details about your store.</p>