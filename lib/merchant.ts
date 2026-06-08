import { getSupabaseServerClient } from "./supabase";

export interface MerchantConfig {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
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
  created_at: string;
}

// In-memory cache: key -> { data, timestamp }
const cache = new Map<
  string,
  { data: MerchantConfig | null; timestamp: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): MerchantConfig | null | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return undefined;
  }
  return entry.data;
}

function setCache(key: string, data: MerchantConfig | null): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function rowToMerchant(row: Record<string, unknown>): MerchantConfig {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    custom_domain: (row.custom_domain as string) || null,
    shopify_domain: row.shopify_domain as string,
    shopify_token: row.shopify_token as string,
    whop_api_key: row.whop_api_key as string,
    whop_company_id: row.whop_company_id as string,
    whop_product_id: row.whop_product_id as string,
    logo_url: (row.logo_url as string) || null,
    brand_color: (row.brand_color as string) || "#111827",
    accent_color: (row.accent_color as string) || "#059669",
    store_url: (row.store_url as string) || null,
    store_name: (row.store_name as string) || null,
    active: row.active as boolean,
    created_at: row.created_at as string,
  };
}

export async function getMerchantByDomain(
  domain: string
): Promise<MerchantConfig | null> {
  const cacheKey = `domain:${domain}`;
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;

  const supabase = getSupabaseServerClient();

  // First try custom_domain exact match
  let { data, error } = await supabase
    .from("merchants")
    .select("*")
    .eq("custom_domain", domain)
    .eq("active", true)
    .single();

  if (!data && !error?.message?.includes("multiple")) {
    // Try as slug subdomain: extract slug from e.g. "mystore.checkoutsaas.com"
    const slug = domain.split(".")[0];
    const result = await supabase
      .from("merchants")
      .select("*")
      .eq("slug", slug)
      .eq("active", true)
      .single();
    data = result.data;
    error = result.error;
  }

  const merchant = data ? rowToMerchant(data) : null;
  setCache(cacheKey, merchant);

  // Also cache by id and slug for cross-lookup
  if (merchant) {
    setCache(`id:${merchant.id}`, merchant);
    setCache(`slug:${merchant.slug}`, merchant);
  }

  return merchant;
}

export async function getMerchantBySlug(
  slug: string
): Promise<MerchantConfig | null> {
  const cacheKey = `slug:${slug}`;
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("merchants")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  const merchant = data ? rowToMerchant(data) : null;
  setCache(cacheKey, merchant);

  if (merchant) {
    setCache(`id:${merchant.id}`, merchant);
    if (merchant.custom_domain) {
      setCache(`domain:${merchant.custom_domain}`, merchant);
    }
  }

  return merchant;
}

export async function getMerchantById(
  id: string
): Promise<MerchantConfig | null> {
  const cacheKey = `id:${id}`;
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("merchants")
    .select("*")
    .eq("id", id)
    .eq("active", true)
    .single();

  const merchant = data ? rowToMerchant(data) : null;
  setCache(cacheKey, merchant);

  if (merchant) {
    setCache(`slug:${merchant.slug}`, merchant);
    if (merchant.custom_domain) {
      setCache(`domain:${merchant.custom_domain}`, merchant);
    }
  }

  return merchant;
}
