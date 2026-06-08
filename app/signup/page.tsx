"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  function handleStoreNameChange(value: string) {
    setStoreName(value);
    // Auto-generate slug from store name
    const generated = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(generated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!email || !storeName || !slug) {
      setError("All fields are required.");
      setLoading(false);
      return;
    }

    // Validate slug format
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length > 1) {
      setError("Slug can only contain lowercase letters, numbers, and hyphens.");
      setLoading(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();

      // Check if slug is already taken
      const { data: existingMerchant } = await supabase
        .from("merchants")
        .select("id")
        .eq("slug", slug)
        .single();

      if (existingMerchant) {
        setError("This slug is already taken. Please choose a different one.");
        setLoading(false);
        return;
      }

      // Check if email is already registered
      const { data: existingUser } = await supabase
        .from("merchant_users")
        .select("id")
        .eq("email", email)
        .single();

      if (existingUser) {
        setError("This email is already registered. Please sign in instead.");
        setLoading(false);
        return;
      }

      // Create the merchant row
      const { data: newMerchant, error: merchantError } = await supabase
        .from("merchants")
        .insert({
          name: storeName,
          slug,
          email,
          store_name: storeName,
          shopify_domain: "",
          shopify_token: "",
          whop_api_key: "",
          whop_company_id: "",
          whop_product_id: "",
        })
        .select()
        .single();

      if (merchantError) {
        throw new Error(merchantError.message);
      }

      // Create the merchant_user row
      const { error: userError } = await supabase.from("merchant_users").insert({
        merchant_id: newMerchant.id,
        email,
        role: "owner",
      });

      if (userError) {
        // Clean up the merchant if user creation fails
        await supabase.from("merchants").delete().eq("id", newMerchant.id);
        throw new Error(userError.message);
      }

      // Sign up via Supabase Auth (magic link)
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard/setup`,
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-500 mt-2">
            Set up your premium checkout in minutes.
          </p>
        </div>

        {sent ? (
          /* Success state */
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Check your email</h2>
            <p className="text-sm text-gray-500 mt-2">
              We sent a magic link to <strong className="text-gray-700">{email}</strong>.
              Click the link to finish setting up your checkout.
            </p>
          </div>
        ) : (
          /* Sign up form */
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="you@yourstore.com"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="storeName" className="block text-sm font-medium text-gray-700 mb-1">
                  Store name
                </label>
                <input
                  id="storeName"
                  type="text"
                  value={storeName}
                  onChange={(e) => handleStoreNameChange(e.target.value)}
                  required
                  placeholder="My Awesome Store"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                  Checkout URL slug
                </label>
                <div className="flex items-center">
                  <input
                    id="slug"
                    type="text"
                    value={slug}
                    onChange={(e) =>
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "")
                      )
                    }
                    required
                    placeholder="my-store"
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-l-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <span className="px-3 py-2.5 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-sm text-gray-500">
                    .checkoutsaas.com
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  This will be your checkout URL. Cannot be changed later.
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !storeName || !slug}
              className="w-full mt-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                "Create account"
              )}
            </button>

            <p className="text-center text-xs text-gray-400 mt-4">
              Already have an account?{" "}
              <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in
              </a>
            </p>
          </form>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Checkout SaaS &mdash; Premium checkout for your store
        </p>
      </div>
    </div>
  );
}
