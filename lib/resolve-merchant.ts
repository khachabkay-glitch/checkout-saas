import { headers } from "next/headers";
import { getMerchantBySlug, getMerchantByDomain } from "./merchant";

export async function resolveMerchant() {
  const h = await headers();
  const slug = h.get("x-merchant-slug");
  const domain = h.get("x-merchant-domain");

  if (slug) return getMerchantBySlug(slug);
  if (domain) return getMerchantByDomain(domain);
  return null;
}
