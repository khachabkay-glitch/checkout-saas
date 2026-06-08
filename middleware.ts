import { NextRequest, NextResponse } from "next/server";

// The main app domain — requests here go to landing page / dashboard
const APP_DOMAIN = "checkoutsaas.com";
const APP_DOMAINS = [
  "checkoutsaas.com",
  "www.checkoutsaas.com",
  "localhost:3000",
  "localhost",
];

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;

  // Strip port for comparison
  const hostnameWithoutPort = hostname.split(":")[0];

  // If it's the main app domain or Vercel preview domain, let it through
  if (
    APP_DOMAINS.some(
      (d) => hostname === d || hostnameWithoutPort === d.split(":")[0]
    ) ||
    hostnameWithoutPort.endsWith(".vercel.app")
  ) {
    return NextResponse.next();
  }

  // Check if this is a slug-based subdomain: {slug}.checkoutsaas.com
  const isSubdomain =
    hostname.endsWith(`.${APP_DOMAIN}`) ||
    hostname.endsWith(`.localhost:3000`) ||
    hostname.endsWith(`.localhost`);

  let merchantSlug: string | null = null;
  let isCustomDomain = false;

  if (isSubdomain) {
    // Extract slug from subdomain
    merchantSlug = hostnameWithoutPort.split(".")[0];
    if (merchantSlug === "www") {
      // www.checkoutsaas.com → main app
      return NextResponse.next();
    }
  } else {
    // Custom domain — we'll resolve it in the page/API route
    isCustomDomain = true;
  }

  // Set headers so downstream pages/API routes know which merchant this is
  const requestHeaders = new Headers(request.headers);

  if (merchantSlug) {
    requestHeaders.set("x-merchant-slug", merchantSlug);
  }

  if (isCustomDomain) {
    requestHeaders.set("x-merchant-domain", hostname);
  }

  // For custom domains or subdomains, rewrite to the checkout routes
  // The actual merchant resolution (DB lookup) happens in the page/API route
  // using the x-merchant-slug or x-merchant-domain header
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return response;
}

export const config = {
  // Match all paths except static files and internal Next.js paths
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
