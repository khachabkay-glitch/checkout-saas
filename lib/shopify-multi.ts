import { MerchantConfig } from "./merchant";

/**
 * Get the Shopify Admin API access token for a merchant.
 * In the multi-tenant model, each merchant stores their token in the DB.
 * No OAuth flow needed — merchants provide their token during onboarding.
 */
export function getAdminToken(merchant: MerchantConfig): string {
  if (!merchant.shopify_token) {
    throw new Error(
      `No Shopify token configured for merchant: ${merchant.slug}`
    );
  }
  return merchant.shopify_token;
}

/**
 * Build the Shopify Admin API base URL for a merchant.
 */
export function getShopifyAdminUrl(merchant: MerchantConfig): string {
  return `https://${merchant.shopify_domain}/admin/api/2024-10`;
}

/**
 * Make an authenticated request to a merchant's Shopify Admin API.
 */
export async function shopifyAdminFetch(
  merchant: MerchantConfig,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAdminToken(merchant);
  const baseUrl = getShopifyAdminUrl(merchant);

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${baseUrl}${endpoint}`;

  return fetch(url, {
    ...options,
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}
