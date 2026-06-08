"use client";

import Link from "next/link";
import { useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  SVG icon helpers                                                   */
/* ------------------------------------------------------------------ */

function IconBranding() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="24" height="24" rx="6" stroke="#059669" strokeWidth="2" />
      <circle cx="16" cy="14" r="4" stroke="#059669" strokeWidth="2" />
      <path d="M10 24c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconPayment() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="8" width="26" height="16" rx="3" stroke="#059669" strokeWidth="2" />
      <line x1="3" y1="14" x2="29" y2="14" stroke="#059669" strokeWidth="2" />
      <rect x="7" y="18" width="8" height="2" rx="1" fill="#059669" />
    </svg>
  );
}

function IconOrder() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="4" width="20" height="24" rx="3" stroke="#059669" strokeWidth="2" />
      <line x1="11" y1="11" x2="21" y2="11" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
      <line x1="11" y1="16" x2="21" y2="16" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
      <line x1="11" y1="21" x2="17" y2="21" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconMobile() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="3" width="16" height="26" rx="3" stroke="#059669" strokeWidth="2" />
      <line x1="14" y1="25" x2="18" y2="25" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 4L6 9v7c0 6.6 4.3 12.3 10 14 5.7-1.7 10-7.4 10-14V9L16 4z" stroke="#059669" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 16l3 3 5-6" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconDashboard() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="10" height="12" rx="2" stroke="#059669" strokeWidth="2" />
      <rect x="18" y="4" width="10" height="8" rx="2" stroke="#059669" strokeWidth="2" />
      <rect x="4" y="20" width="10" height="8" rx="2" stroke="#059669" strokeWidth="2" />
      <rect x="18" y="16" width="10" height="12" rx="2" stroke="#059669" strokeWidth="2" />
    </svg>
  );
}

function IconDomain() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="12" stroke="#059669" strokeWidth="2" />
      <ellipse cx="16" cy="16" rx="6" ry="12" stroke="#059669" strokeWidth="2" />
      <line x1="4" y1="16" x2="28" y2="16" stroke="#059669" strokeWidth="2" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="12" stroke="#059669" strokeWidth="2" />
      <path d="M16 10v6l4 4" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 10l4 4 6-7" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Checkout mockup (CSS only, no images)                              */
/* ------------------------------------------------------------------ */

function CheckoutMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[380px]">
      {/* Glow behind card */}
      <div
        className="absolute -inset-4 rounded-3xl opacity-20 blur-2xl"
        style={{ background: "radial-gradient(circle, #059669 0%, transparent 70%)" }}
      />
      <div className="relative rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-sm">
        {/* Header bar */}
        <div className="mb-5 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-600/30" />
          <div className="h-3 w-24 rounded bg-white/20" />
        </div>
        {/* Email field */}
        <div className="mb-3">
          <div className="mb-1.5 h-2 w-10 rounded bg-white/15" />
          <div className="h-10 rounded-lg border border-white/10 bg-white/[0.04] px-3 flex items-center">
            <div className="h-2 w-36 rounded bg-white/10" />
          </div>
        </div>
        {/* Name fields */}
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <div className="mb-1.5 h-2 w-14 rounded bg-white/15" />
            <div className="h-10 rounded-lg border border-white/10 bg-white/[0.04]" />
          </div>
          <div>
            <div className="mb-1.5 h-2 w-14 rounded bg-white/15" />
            <div className="h-10 rounded-lg border border-white/10 bg-white/[0.04]" />
          </div>
        </div>
        {/* Address field */}
        <div className="mb-4">
          <div className="mb-1.5 h-2 w-12 rounded bg-white/15" />
          <div className="h-10 rounded-lg border border-white/10 bg-white/[0.04]" />
        </div>
        {/* Pay button */}
        <div className="h-11 rounded-lg bg-emerald-600 flex items-center justify-center">
          <div className="h-2.5 w-16 rounded bg-white/40" />
        </div>
        {/* Security badge */}
        <div className="mt-3 flex items-center justify-center gap-1.5">
          <div className="h-3 w-3 rounded-full border border-white/15" />
          <div className="h-1.5 w-20 rounded bg-white/10" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step card for "How it works"                                       */
/* ------------------------------------------------------------------ */

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white text-lg font-semibold">
        {number}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-[#111827]">{title}</h3>
      <p className="text-sm leading-relaxed text-[#6B7280] max-w-xs">{description}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature card                                                       */
/* ------------------------------------------------------------------ */

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-[#E8E8E3] bg-white p-6 transition-shadow hover:shadow-md">
      <div className="mb-3">{icon}</div>
      <h3 className="mb-1.5 text-base font-semibold text-[#111827]">{title}</h3>
      <p className="text-sm leading-relaxed text-[#6B7280]">{description}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main landing page                                                  */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const scrollToDemo = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }}>
      {/* ---- NAV ---- */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#111827]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight text-white">
            Checkout<span className="text-emerald-500">SaaS</span>
          </span>
          <div className="flex items-center gap-5">
            <Link
              href="/login"
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ---- HERO ---- */}
      <section className="relative overflow-hidden bg-[#111827] pt-32 pb-20 md:pt-40 md:pb-28">
        {/* Background grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        {/* Top gradient accent */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] opacity-15 blur-3xl" style={{ background: "radial-gradient(ellipse, #059669, transparent)" }} />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-white/60 tracking-wide uppercase">
                  For Shopify merchants using Whop
                </span>
              </div>
              <h1 className="mb-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-white md:text-5xl lg:text-[3.5rem]">
                Your checkout.{" "}
                <br className="hidden sm:block" />
                Your brand.{" "}
                <br className="hidden sm:block" />
                <span className="text-emerald-400">Zero Shopify fees.</span>
              </h1>
              <p className="mb-8 max-w-lg text-lg leading-relaxed text-white/60">
                A premium, conversion-optimized checkout that connects Whop payments
                to Shopify. Your customers get a seamless experience. You keep full
                control.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-600/20"
                >
                  Get Started
                  <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <button
                  onClick={scrollToDemo}
                  className="inline-flex items-center rounded-lg border border-white/15 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/[0.08]"
                >
                  See How It Works
                </button>
              </div>
            </div>

            {/* Mockup */}
            <div className="hidden lg:block">
              <CheckoutMockup />
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-3 gap-6 border-t border-white/10 pt-10 md:mt-20 md:pt-12">
            {[
              { value: "0%", label: "Shopify checkout fees" },
              { value: "100%", label: "Your branding" },
              { value: "<10min", label: "Setup time" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-white md:text-3xl">{stat.value}</div>
                <div className="mt-1 text-xs text-white/40 md:text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- HOW IT WORKS ---- */}
      <section id="how-it-works" className="bg-[#FAFAF8] py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-600">
              Simple setup
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] md:text-4xl">
              Live in three steps
            </h2>
          </div>
          <div className="grid gap-10 md:grid-cols-3 md:gap-8">
            <StepCard
              number="1"
              title="Connect your Shopify store"
              description="Link your store with a single API key. We handle the rest -- products, variants, inventory sync."
            />
            <StepCard
              number="2"
              title="Set up Whop payments"
              description="Connect your Whop account to process payments. Your money, your processor, your terms."
            />
            <StepCard
              number="3"
              title="Go live with your branded checkout"
              description="Add your logo, colors, and custom domain. Your checkout is ready to convert."
            />
          </div>
        </div>
      </section>

      {/* ---- FEATURES ---- */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-600">
              Everything you need
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] md:text-4xl">
              Built for serious merchants
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<IconBranding />}
              title="Custom branding"
              description="Your logo, colors, and domain. The checkout feels like your store, because it is."
            />
            <FeatureCard
              icon={<IconPayment />}
              title="Whop payment processing"
              description="Accept payments through Whop. No Shopify transaction fees eating into your margins."
            />
            <FeatureCard
              icon={<IconOrder />}
              title="Automatic Shopify orders"
              description="Every payment creates a Shopify order automatically. Fulfillment stays in your existing workflow."
            />
            <FeatureCard
              icon={<IconMobile />}
              title="Mobile-optimized"
              description="Responsive checkout that converts on every device. Fast loading, clean interface."
            />
            <FeatureCard
              icon={<IconShield />}
              title="Payment verification"
              description="Built-in verification ensures every order is legitimate before it reaches Shopify."
            />
            <FeatureCard
              icon={<IconDashboard />}
              title="Real-time dashboard"
              description="Track orders, revenue, and conversion rates from a single clean interface."
            />
            <FeatureCard
              icon={<IconDomain />}
              title="Custom domain"
              description="Run your checkout on your own domain. checkout.yourstore.com -- fully white-labeled."
            />
            <FeatureCard
              icon={<IconClock />}
              title="Setup in under 10 minutes"
              description="No developers needed. Connect, configure, launch. We made onboarding dead simple."
            />
          </div>
        </div>
      </section>

      {/* ---- PRICING ---- */}
      <section className="bg-[#FAFAF8] py-20 md:py-28">
        <div className="mx-auto max-w-xl px-6">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-600">
              Pricing
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] md:text-4xl">
              One plan. Everything included.
            </h2>
          </div>
          <div className="rounded-2xl border border-[#E8E8E3] bg-white p-8 shadow-sm md:p-10">
            <div className="mb-6 text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-extrabold tracking-tight text-[#111827]">
                  &euro;150
                </span>
                <span className="text-lg text-[#6B7280]">/month</span>
              </div>
              <p className="mt-2 text-sm text-[#6B7280]">
                No hidden fees. No per-transaction charges.
              </p>
            </div>
            <div className="mb-8 space-y-3">
              {[
                "Unlimited orders",
                "Custom domain",
                "Full branding control",
                "Dashboard & analytics",
                "Whop payment integration",
                "Automatic Shopify orders",
                "Mobile-optimized checkout",
                "Priority support",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckIcon />
                  <span className="text-sm text-[#374151]">{item}</span>
                </div>
              ))}
            </div>
            <Link
              href="/signup"
              className="block w-full rounded-lg bg-emerald-600 py-3.5 text-center text-sm font-semibold text-white transition-all hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-600/20"
            >
              Start Now
            </Link>
            <p className="mt-4 text-center text-xs text-[#9CA3AF]">
              Cancel anytime. No long-term contracts.
            </p>
          </div>
        </div>
      </section>

      {/* ---- FOOTER ---- */}
      <footer className="border-t border-[#E8E8E3] bg-[#FAFAF8] py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
            <div>
              <span className="text-base font-bold tracking-tight text-[#111827]">
                Checkout<span className="text-emerald-600">SaaS</span>
              </span>
              <p className="mt-1 text-sm text-[#6B7280]">
                Built for serious e-commerce operators.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="/login"
                className="text-sm text-[#6B7280] transition-colors hover:text-[#111827]"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="text-sm text-[#6B7280] transition-colors hover:text-[#111827]"
              >
                Sign Up
              </Link>
              <a
                href="mailto:khachabkay@gmail.com"
                className="text-sm text-[#6B7280] transition-colors hover:text-[#111827]"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
