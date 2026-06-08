import { getSupabaseBrowserClient } from "@/lib/supabase";

export interface AuthenticatedMerchant {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  email: string;
  shopify_domain: string;
  shopify_token: string;
  whop_api_key: string;
  whop_company_id: string;
  whop_product_id: string;
  logo_url: string | null;
  brand_color: string;
  accent_color: string;
  store_url: string | null;
  store_name: string | null;
  active: boolean;
  plan_status: string;
  whop_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Client-side: get the authenticated merchant for the current user.
 * Checks Supabase auth session, looks up merchant_users, returns merchant config.
 * Returns null if not authenticated or no merchant found.
 */
export async function getAuthenticatedMerchant(): Promise<AuthenticatedMerchant | null> {
  const supabase = getSupabaseBrowserClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return null;
  }

  const userEmail = session.user.email;
  if (!userEmail) return null;

  // Look up merchant_user by email
  const { data: merchantUser, error: muError } = await supabase
    .from("merchant_users")
    .select("merchant_id")
    .eq("email", userEmail)
    .single();

  if (muError || !merchantUser) {
    return null;
  }

  // Get the merchant config
  const { data: merchant, error: mError } = await supabase
    .from("merchants")
    .select("*")
    .eq("id", merchantUser.merchant_id)
    .single();

  if (mError || !merchant) {
    return null;
  }

  return merchant as AuthenticatedMerchant;
}

/**
 * Get the current Supabase auth session (client-side).
 */
export async function getAuthSession() {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Sign out the current user (client-side).
 */
export async function signOut() {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
}
