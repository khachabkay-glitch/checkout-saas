import { headers } from "next/headers";
import { redirect } from "next/navigation";
import LandingPage from "@/components/landing";

export default async function HomePage() {
  const h = await headers();
  const slug = h.get("x-merchant-slug");
  const domain = h.get("x-merchant-domain");

  // If on a merchant domain/subdomain, redirect to checkout
  if (slug || domain) {
    redirect("/checkout");
  }

  // Main app domain — show landing page
  return <LandingPage />;
}
