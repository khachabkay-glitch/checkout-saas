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
  store_name: "", store_url: "", shopify_domain: "", shopify_token: "",
  whop_api_key: "", whop_company_id: "", whop_product_id: "",
  brand_color: "#000000", accent_color: "#4F46E5", logo_url: "", custom_domain: "",
};

function FieldGroup({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

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
        if (!data) { router.push("/login"); return; }
        setMerchant(data as MerchantData);
        setForm({
          store_name: data.store_name ?? "", store_url: data.store_url ?? "",
          shopify_domain: data.shopify_domain ?? "", shopify_token: data.shopify_token ?? "",
          whop_api_key: data.whop_api_key ?? "", whop_company_id: data.whop_company_id ?? "",
          whop_product_id: data.whop_product_id ?? "", brand_color: data.brand_color ?? "#000000",
          accent_color: data.accent_color ?? "#4F46E5", logo_url: data.logo_url ?? "",
          custom_domain: data.custom_domain ?? "",
        });
      } catch { router.push("/login"); } finally { setLoading(false); }
    }
    loadMerchant();
  }, [router]);

  function showToastMsg(message: string, type: "success" | "error") {
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
      const { error } = await supabase.from("merchants").update({
        store_name: form.store_name, store_url: form.store_url,
        shopify_domain: form.shopify_domain, shopify_token: form.shopify_token,
        whop_api_key: form.whop_api_key, whop_company_id: form.whop_company_id,
        whop_product_id: form.whop_product_id, brand_color: form.brand_color,
        accent_color: form.accent_color, logo_url: form.logo_url,
        custom_domain: form.custom_domain,
      }).eq("id", merchant.id);
      if (error) { showToastMsg("Failed to save: " + error.message, "error"); }
      else { showToastMsg("Settings saved successfully.", "success"); }
    } catch (err: unknown) {
      showToastMsg(err instanceof Error ? err.message : "An unexpected error occurred.", "error");
    } finally { setSaving(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" /></div>;
  if (!merchant) return null;

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent";

  return (
    <div>
      {toast && (
        <div className="fixed top-6 right-6 z-50">
          <div className={`px-5 py-3 rounded-lg shadow-lg text-sm font-medium \${toast.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {toast.message}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your store configuration and integrations.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-1">Store Information</h2>
          <p className="text-sm text-gray-500 mb-6">Basic details about your store.</p>
          <div className="space-y-5">
            <FieldGroup label="Store Name" htmlFor="store_name">
              <input id="store_name" type="text" value={form.store_name} onChange={(e) => handleChange("store_name", e.target.value)} placeholder="My Store" className={inputClass} />
            </FieldGroup>
            <FieldGroup label="Store URL" htmlFor="store_url">
              <input id="store_url" type="text" value={form.store_url} onChange={(e) => handleChange("store_url", e.target.value)} placeholder="https://mystore.com" className={inputClass} />
            </FieldGroup>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-1">Shopify Configuration</h2>
          <p className="text-sm text-gray-500 mb-6">Connect your Shopify store to enable order syncing.</p>
          <div className="space-y-5">
            <FieldGroup label="Shopify Domain" htmlFor="shopify_domain">
              <input id="shopify_domain" type="text" value={form.shopify_domain} onChange={(e) => handleChange("shopify_domain", e.target.value)} placeholder="mystore.myshopify.com" className={inputClass} />
            </FieldGroup>
            <FieldGroup label="Shopify Access Token" htmlFor="shopify_token">
              <div className="relative">
                <input id="shopify_token" type={showShopifyToken ? "text" : "password"} value={form.shopify_token} onChange={(e) => handleChange("shopify_token", e.target.value)} placeholder="shpat_xxxxxxxxxxxxxxxx" className={inputClass + " pr-20"} />
                <button type="button" onClick={() => setShowShopifyToken((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 font-medium">{showShopifyToken ? "Hide" : "Reveal"}</button>
              </div>
            </FieldGroup>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-1">Whop Configuration</h2>
          <p className="text-sm text-gray-500 mb-6">Configure your Whop integration for payment processing.</p>
          <div className="space-y-5">
            <FieldGroup label="Whop API Key" htmlFor="whop_api_key">
              <div className="relative">
                <input id="whop_api_key" type={showWhopApiKey ? "text" : "password"} value={form.whop_api_key} onChange={(e) => handleChange("whop_api_key", e.target.value)} placeholder="whop_xxxxxxxxxxxxxxxx" className={inputClass + " pr-20"} />
                <button type="button" onClick={() => setShowWhopApiKey((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 font-medium">{showWhopApiKey ? "Hide" : "Reveal"}</button>
              </div>
            </FieldGroup>
            <FieldGroup label="Whop Company ID" htmlFor="whop_company_id">
              <input id="whop_company_id" type="text" value={form.whop_company_id} onChange={(e) => handleChange("whop_company_id", e.target.value)} placeholder="biz_xxxxxxxx" className={inputClass} />
            </FieldGroup>
            <FieldGroup label="Whop Product ID" htmlFor="whop_product_id">
              <input id="whop_product_id" type="text" value={form.whop_product_id} onChange={(e) => handleChange("whop_product_id", e.target.value)} placeholder="prod_xxxxxxxx" className={inputClass} />
            </FieldGroup>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-1">Branding</h2>
          <p className="text-sm text-gray-500 mb-6">Customize the look of your checkout experience.</p>
          <div className="space-y-5">
            <FieldGroup label="Brand Color" htmlFor="brand_color">
              <div className="flex items-center gap-3">
                <input type="color" value={form.brand_color} onChange={(e) => handleChange("brand_color", e.target.value)} className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5" />
                <input id="brand_color" type="text" value={form.brand_color} onChange={(e) => handleChange("brand_color", e.target.value)} placeholder="#000000" className={inputClass + " flex-1 font-mono"} />
              </div>
            </FieldGroup>
            <FieldGroup label="Accent Color" htmlFor="accent_color">
              <div className="flex items-center gap-3">
                <input type="color" value={form.accent_color} onChange={(e) => handleChange("accent_color", e.target.value)} className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5" />
                <input id="accent_color" type="text" value={form.accent_color} onChange={(e) => handleChange("accent_color", e.target.value)} placeholder="#4F46E5" className={inputClass + " flex-1 font-mono"} />
              </div>
            </FieldGroup>
            <FieldGroup label="Logo URL" htmlFor="logo_url">
              <input id="logo_url" type="text" value={form.logo_url} onChange={(e) => handleChange("logo_url", e.target.value)} placeholder="https://cdn.example.com/logo.png" className={inputClass} />
            </FieldGroup>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-1">Custom Domain</h2>
          <p className="text-sm text-gray-500 mb-6">Use your own domain for the checkout page.</p>
          <FieldGroup label="Custom Domain" htmlFor="custom_domain">
            <input id="custom_domain" type="text" value={form.custom_domain} onChange={(e) => handleChange("custom_domain", e.target.value)} placeholder="checkout.mystore.com" className={inputClass} />
          </FieldGroup>
        </section>

        <div className="flex justify-end pt-2 pb-8">
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}