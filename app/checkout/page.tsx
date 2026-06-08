"use client";

import { Suspense, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import ContactForm from "@/components/checkout/ContactForm";
import ShippingForm, { ShippingAddress } from "@/components/checkout/ShippingForm";
import ShippingMethod from "@/components/checkout/ShippingMethod";
import BillingAddress from "@/components/checkout/BillingAddress";
import PaymentSection from "@/components/checkout/PaymentSection";
import OrderSummary from "@/components/checkout/OrderSummary";
import MobileOrderSummary from "@/components/checkout/MobileOrderSummary";
import { dialFor } from "@/components/checkout/PhoneField";

interface LineItem {
  variantId: string;
  productTitle: string;
  variantTitle: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  currency: string;
  image: string;
}

interface ShippingRate {
  handle: string;
  title: string;
  price: string;
}

interface MerchantPublic {
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string;
  accent_color: string;
  store_url: string | null;
  store_name: string | null;
}

function Logo({ merchantConfig }: { merchantConfig: MerchantPublic | null }) {
  const storeName = merchantConfig?.store_name || merchantConfig?.name || "Store";
  const logoUrl = merchantConfig?.logo_url;

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={storeName}
        style={{ width: "200px", height: "auto", maxWidth: "100%", display: "block", margin: "0 auto" }}
      />
    );
  }

  return (
    <div style={{ textAlign: "center", fontSize: "24px", fontWeight: 700, color: "var(--text-primary)" }}>
      {storeName}
    </div>
  );
}

function CheckoutPageLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-left)" }}>
      <header style={{ padding: "32px 0 24px", borderBottom: "1px solid var(--divider)" }}>
        <div style={{ textAlign: "center", fontSize: "24px", fontWeight: 700, color: "var(--text-primary)" }}>Loading...</div>
      </header>
      <main className="max-w-[1080px] mx-auto px-6 py-8">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="sk" style={{ height: "120px", borderRadius: "12px", background: "#F3F4F6" }} />
          ))}
        </div>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutPageLoading />}>
      <CheckoutPageInner />
    </Suspense>
  );
}

function CheckoutPageInner() {
  const searchParams = useSearchParams();

  const cartParam = searchParams.get("cart") || "";
  const storeId = searchParams.get("storeId") || "";
  const country = searchParams.get("country") || "IT";

  const [merchantConfig, setMerchantConfig] = useState<MerchantPublic | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [currency, setCurrency] = useState("EUR");

  const [whopPlanId, setWhopPlanId] = useState("");
  const [whopCheckoutSessionId, setWhopCheckoutSessionId] = useState("");

  const [email, setEmail] = useState("");
  const [phoneCountry, setPhoneCountry] = useState(country);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const [address, setAddress] = useState<ShippingAddress>({
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    country,
    zip: "",
  });

  const DEFAULT_SHIPPING: ShippingRate = { handle: "free-shipping", title: "FREE Shipping Incl. Track & Trace", price: "0.00" };
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([DEFAULT_SHIPPING]);
  const [selectedShipping, setSelectedShipping] = useState("free-shipping");
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);

  const [billingSame, setBillingSame] = useState(true);

  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState("");
  const [promoError, setPromoError] = useState("");
  const [discount, setDiscount] = useState(0);

  const [paymentError, setPaymentError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderStatus, setOrderStatus] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const orderCreatedRef = useRef(false);
  const whopRef = useRef<any>(null);

  const storeName = merchantConfig?.store_name || merchantConfig?.name || "Store";
  const storeUrl = merchantConfig?.store_url || "/";

  const fullPhone = useMemo(() => {
    if (!phoneNumber.trim()) return "";
    return `${dialFor(phoneCountry)} ${phoneNumber.trim()}`;
  }, [phoneCountry, phoneNumber]);

  // Fetch merchant config on mount
  useEffect(() => {
    fetch("/api/merchant")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setMerchantConfig(data);
          // Apply branding CSS variables
          const root = document.documentElement;
          if (data.brand_color) {
            root.style.setProperty("--btn-bg", data.brand_color);
            root.style.setProperty("--text", data.brand_color);
            root.style.setProperty("--input-focus", data.brand_color);
          }
          if (data.accent_color) {
            root.style.setProperty("--accent", data.accent_color);
          }
        }
      })
      .catch((err) => console.error("Failed to fetch merchant config:", err));
  }, []);

  const createOrderNow = useCallback(async (paymentId: string) => {
    // Clear any pending checkout timeout
    if (typeof window !== "undefined" && (window as any).__checkoutTimeout) {
      clearTimeout((window as any).__checkoutTimeout);
      delete (window as any).__checkoutTimeout;
    }

    if (orderCreatedRef.current) return;
    orderCreatedRef.current = true;

    setSubmitting(true);
    setOrderStatus("Creating your order...");

    const orderData = {
      paymentId,
      sessionId,
      whopCheckoutSessionId,
      email,
      phone: fullPhone,
      shippingAddress: address,
      shippingMethod: shippingRates.find((r) => r.handle === selectedShipping),
      shippingCost,
      lineItems,
      subtotal,
      currency,
      marketingOptIn,
      promoCode: promoApplied || undefined,
    };

    try { localStorage.setItem("pendingOrder", JSON.stringify(orderData)); } catch {}

    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      const data = await res.json();
      if (!res.ok) {
        let errMsg = data.error || "Order creation failed";
        if (errMsg.length > 200 || errMsg.includes("<")) {
          errMsg = "An error occurred. Payment was received — contact support.";
        }
        setOrderStatus("");
        setPaymentError(errMsg);
        orderCreatedRef.current = false;
        setSubmitting(false);
        return;
      }

      setOrderStatus("Order created! Redirecting...");
      localStorage.removeItem("pendingOrder");
      window.location.href = `/confirmation?orderId=${data.orderId}&orderNumber=${data.orderNumber || ""}&orderName=${encodeURIComponent(data.orderName || "")}&email=${encodeURIComponent(email)}&firstName=${encodeURIComponent(address.firstName)}&total=${(subtotal + shippingCost - discount).toFixed(2)}&currency=${encodeURIComponent(currency)}`;
    } catch (err: any) {
      setPaymentError(err.message);
      setOrderStatus("");
      orderCreatedRef.current = false;
      setSubmitting(false);
    }
  }, [email, fullPhone, address, shippingRates, selectedShipping, shippingCost, lineItems, subtotal, currency, whopCheckoutSessionId, sessionId, marketingOptIn, promoApplied, discount]);

  useEffect(() => {
    const isTrustedOrigin = (origin: string) =>
      origin === "https://whop.com" ||
      origin === "https://sandbox.whop.com" ||
      origin.endsWith(".whop.com");

    const handleMessage = (event: MessageEvent) => {
      const d = event.data;

      if (event.origin && event.origin.includes("whop.com")) {
        try { console.log("[Whop PostMessage]", JSON.stringify(d, null, 2)); } catch {}
      }

      if (!d || typeof d !== "object") return;
      if (!isTrustedOrigin(event.origin)) return;

      const isWhopEmbed = d.__scope === "whop-embedded-checkout";

      const isError =
        (isWhopEmbed && d.event === "address-validation-error") ||
        d.event === "payment.failed" ||
        d.type === "error" ||
        d.status === "failed" ||
        d.status === "error" ||
        (typeof d.error === "string" && !!d.error);

      if (isError) {
        console.error("[Whop] Payment error event:", d);
        const message =
          (isWhopEmbed && d.error_message) ||
          (typeof d.error === "object" && d.error?.message) ||
          (typeof d.error === "string" && d.error) ||
          d.message ||
          "Payment declined. Please try another card.";
        setPaymentError(message);
        setSubmitting(false);
        orderCreatedRef.current = false;
        if (typeof window !== "undefined" && (window as any).__checkoutTimeout) {
          clearTimeout((window as any).__checkoutTimeout);
          delete (window as any).__checkoutTimeout;
        }
        return;
      }

      const isSuccess =
        (isWhopEmbed && d.event === "complete") ||
        d.event === "payment.completed" ||
        d.event === "checkout.completed" ||
        d.type === "whop:checkout:complete" ||
        d.status === "paid" ||
        d.status === "completed" ||
        !!d.receipt_id;

      if (isSuccess && !orderCreatedRef.current) {
        createOrderNow(d.receipt_id || d.setup_intent_id || d.checkout_session_id || d.id || "whop");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [createOrderNow]);

  useEffect(() => {
    const paymentSuccess = searchParams.get("payment_success");
    const urlSessionId = searchParams.get("session_id") || searchParams.get("checkout_session_id");
    if ((paymentSuccess === "true" || urlSessionId) && !orderCreatedRef.current) {
      createOrderNow(urlSessionId || "redirect");
    }
  }, [searchParams, createOrderNow]);

  useEffect(() => {
    if (!cartParam) {
      setError("No cart data provided. Return to the store.");
      setLoading(false);
      return;
    }

    let cartData: any;
    try {
      cartData = JSON.parse(decodeURIComponent(escape(atob(cartParam))));
    } catch {
      setError("Invalid cart data. Return to the store and try again.");
      setLoading(false);
      return;
    }

    fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cartData, storeId, country }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSessionId(data.sessionId);
        setSessionToken(data.sessionToken || "");
        setLineItems(data.cart.lineItems);
        setSubtotal(data.cart.subtotal);
        setCurrency(data.cart.currency);
        if (data.whopPlanId) setWhopPlanId(data.whopPlanId);
        if (data.whopCheckoutSessionId) setWhopCheckoutSessionId(data.whopCheckoutSessionId);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [cartParam, storeId, country]);

  const addrCountry = address.country;
  const addrCity = address.city;
  const addrZip = address.zip;
  const addrAddress1 = address.address1;
  const addrProvince = address.province;

  useEffect(() => {
    if (!email || lineItems.length === 0) return;
    try {
      const orderData = {
        email,
        phone: fullPhone,
        sessionId,
        whopCheckoutSessionId,
        shippingAddress: address,
        shippingMethod: shippingRates.find((r) => r.handle === selectedShipping),
        shippingCost,
        lineItems,
        subtotal,
        currency,
      };
      localStorage.setItem("pendingOrder", JSON.stringify(orderData));
    } catch {}
  }, [email, fullPhone, address, selectedShipping, shippingCost, shippingRates, lineItems, subtotal, currency, whopCheckoutSessionId, sessionId]);

  useEffect(() => {
    if (!sessionId || !addrCountry || !addrCity || !addrZip || !addrAddress1) return;

    const timer = setTimeout(async () => {
      setShippingLoading(true);
      try {
        const res = await fetch("/api/shipping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            sessionToken,
            address: {
              firstName: address.firstName,
              lastName: address.lastName,
              address1: addrAddress1,
              address2: address.address2,
              city: addrCity,
              province: addrProvince,
              country: addrCountry,
              zip: addrZip,
            },
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (data.sessionToken) setSessionToken(data.sessionToken);
        if (data.rates && data.rates.length > 0) {
          const hasFree = data.rates.some((r: any) => parseFloat(r.price) === 0);
          const rates = hasFree ? data.rates : [DEFAULT_SHIPPING, ...data.rates];
          setShippingRates(rates);
          if (selectedShipping === "free-shipping" && rates.some((r: ShippingRate) => r.handle === "free-shipping")) {
            // Free shipping was already selected and is still available
          } else {
            setSelectedShipping(rates[0].handle);
            setShippingCost(parseFloat(rates[0].price));
          }
        }
      } catch (err: any) {
        console.error("Shipping error:", err);
      } finally {
        setShippingLoading(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, addrCountry, addrCity, addrZip, addrAddress1, addrProvince]);

  const handleShippingSelect = (handle: string) => {
    setSelectedShipping(handle);
    const rate = shippingRates.find((r) => r.handle === handle);
    if (rate) setShippingCost(parseFloat(rate.price));
  };

  const handleApplyPromo = useCallback(() => {
    setPromoError("");
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setPromoApplied(code);
    setPromoError("Promo codes are verified at the time of payment.");
    setDiscount(0);
  }, [promoCode]);

  const missingFields: string[] = [];
  if (!email.trim()) missingFields.push("email");
  if (!address.firstName.trim()) missingFields.push("first name");
  if (!address.lastName.trim()) missingFields.push("last name");
  if (!address.address1.trim()) missingFields.push("address");
  if (!address.city.trim()) missingFields.push("city");
  if (!address.country) missingFields.push("country");
  if (!address.zip.trim()) missingFields.push("zip code");
  if (!sessionId) missingFields.push("session");

  const canPay = missingFields.length === 0 && !submitting;

  const handlePaymentComplete = useCallback((paymentId: string) => {
    createOrderNow(paymentId);
  }, [createOrderNow]);

  const handleCompleteCheckout = useCallback(async () => {
    setPaymentError("");

    if (missingFields.length > 0) {
      setPaymentError(`Please fill in the following fields: ${missingFields.join(", ")}`);
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    const timeout = setTimeout(() => {
      console.error("[Checkout] Payment timed out after 60 seconds");
      setPaymentError("Payment timed out. Please try again. If you were charged, contact support.");
      setSubmitting(false);
      orderCreatedRef.current = false;
      if (typeof window !== "undefined") delete (window as any).__checkoutTimeout;
    }, 60000);

    if (typeof window !== "undefined") (window as any).__checkoutTimeout = timeout;

    try {
      if (whopRef.current?.submit) {
        if (whopRef.current.__setSubmitPending) {
          whopRef.current.__setSubmitPending(true);
        }
        console.log("[Checkout] Calling whopRef.submit()...");
        await whopRef.current.submit();
        console.log("[Checkout] whopRef.submit() returned — waiting for onComplete or state change");
      } else {
        clearTimeout(timeout);
        if (typeof window !== "undefined") delete (window as any).__checkoutTimeout;
        setPaymentError("Payment is still loading — please wait a moment and try again.");
        setSubmitting(false);
      }
    } catch (err: any) {
      clearTimeout(timeout);
      if (typeof window !== "undefined") delete (window as any).__checkoutTimeout;
      console.error("[Checkout] Payment error:", err);
      setPaymentError(err?.message || "Payment failed. Please try again.");
      setSubmitting(false);
    }
  }, [missingFields, submitting]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-left)" }}>
        <div className="max-w-md text-center">
          <h1 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px" }}>Something went wrong</h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px" }}>{error}</p>
          <a href={storeUrl} className="inline-block" style={{ padding: "12px 28px", background: merchantConfig?.brand_color || "#111827", color: "#FFF", fontSize: "14px", letterSpacing: "0.02em", borderRadius: "8px", textDecoration: "none" }}>
            Return to store
          </a>
        </div>
      </div>
    );
  }

  const PI = ["visa", "mastercard", "amex", "paypal"];

  if (typeof window !== "undefined") {
    console.log("[Checkout Debug]", {
      canPay: missingFields.length === 0,
      missingFields,
      sessionId: sessionId ? "set" : "empty",
      whopPlanId: whopPlanId ? "set" : "empty",
      whopCheckoutSessionId: whopCheckoutSessionId ? "set" : "empty",
      submitting,
      lineItems: lineItems.length,
      subtotal,
      currency,
      merchant: merchantConfig?.slug || "loading",
    });
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-left)" }}>
      <div className="lg:flex min-h-screen">
        {/* LEFT — form */}
        <div className="lg:w-[58%]" style={{ background: "var(--bg-left)", padding: "32px max(24px, 6%) 40px" }}>
          <div className="mx-auto" style={{ maxWidth: "560px" }}>
            <div style={{ padding: "8px 0 32px", textAlign: "center" }}>
              <Logo merchantConfig={merchantConfig} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
              <div className="lg:hidden">
                <MobileOrderSummary
                  lineItems={lineItems}
                  subtotal={subtotal}
                  shippingCost={shippingCost}
                  discount={discount}
                  currency={currency}
                  loading={loading}
                  promoCode={promoCode}
                  promoApplied={promoApplied}
                  promoError={promoError}
                  onPromoCodeChange={setPromoCode}
                  onApplyPromo={handleApplyPromo}
                  open={summaryOpen}
                  onToggle={setSummaryOpen}
                />
              </div>

              <ContactForm
                email={email}
                phoneCountry={phoneCountry}
                phoneNumber={phoneNumber}
                marketingOptIn={marketingOptIn}
                onEmailChange={setEmail}
                onPhoneCountryChange={setPhoneCountry}
                onPhoneNumberChange={setPhoneNumber}
                onMarketingChange={setMarketingOptIn}
              />

              <ShippingForm address={address} onChange={setAddress} />

              <ShippingMethod
                rates={shippingRates}
                selected={selectedShipping}
                loading={shippingLoading}
                onSelect={handleShippingSelect}
                currency={currency}
              />

              <BillingAddress sameAsShipping={billingSame} onChange={setBillingSame} />

              <section>
                <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px" }}>Payment method</h2>
                <PaymentSection
                  ref={whopRef}
                  sessionId={sessionId}
                  sessionToken={sessionToken}
                  total={subtotal + shippingCost - discount}
                  currency={currency}
                  disabled={!canPay}
                  whopPlanId={whopPlanId}
                  whopCheckoutSessionId={whopCheckoutSessionId}
                  customerInfo={{
                    email,
                    phone: fullPhone,
                    shippingAddress: address,
                    shippingMethod: shippingRates.find((r) => r.handle === selectedShipping),
                    shippingCost,
                  }}
                  lineItems={lineItems}
                  subtotal={subtotal}
                  onPaymentComplete={handlePaymentComplete}
                  onError={(err) => {
                    setPaymentError(err);
                    setSubmitting(false);
                    orderCreatedRef.current = false;
                    if (typeof window !== "undefined" && (window as any).__checkoutTimeout) {
                      clearTimeout((window as any).__checkoutTimeout);
                      delete (window as any).__checkoutTimeout;
                    }
                  }}
                />
              </section>

              {paymentError && (
                <div style={{ padding: "12px 14px", background: "#FEF2F2", border: "1px solid #FECACA", color: "var(--error)", fontSize: "13px", borderRadius: "8px" }}>{paymentError}</div>
              )}

              {orderStatus && (
                <div style={{ padding: "12px 14px", background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#166534", fontSize: "13px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  {orderStatus}
                </div>
              )}

              {paymentError && (
                <button
                  type="button"
                  onClick={() => {
                    setPaymentError("");
                    setSubmitting(false);
                    orderCreatedRef.current = false;
                  }}
                  style={{ fontSize: "13px", color: merchantConfig?.accent_color || "var(--accent)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", alignSelf: "center" }}
                >
                  Try again
                </button>
              )}

              <div className="lg:hidden">
                <MobileOrderSummary
                  lineItems={lineItems}
                  subtotal={subtotal}
                  shippingCost={shippingCost}
                  discount={discount}
                  currency={currency}
                  loading={loading}
                  promoCode={promoCode}
                  promoApplied={promoApplied}
                  promoError={promoError}
                  onPromoCodeChange={setPromoCode}
                  onApplyPromo={handleApplyPromo}
                  open={summaryOpen}
                  onToggle={setSummaryOpen}
                />
              </div>

              {/* Trust badges */}
              <div style={{ display: "flex", justifyContent: "center", gap: "20px", padding: "16px 0", color: "var(--text-secondary)", fontSize: "12px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  Secure checkout
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Protected payment
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  Tracked shipping
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                {PI.map((ic) => (
                  <img
                    key={ic}
                    src={`https://cdn.jsdelivr.net/npm/payment-icons@1.1.0/min/flat/${ic}.svg`}
                    alt={ic}
                    style={{ height: "22px", borderRadius: "3px" }}
                  />
                ))}
              </div>

              <div style={{ textAlign: "center", paddingTop: "16px", borderTop: "1px solid var(--divider)", marginTop: "8px" }}>
                {storeUrl && storeUrl !== "/" && (
                  <>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "12px" }}>
                      <a href={`${storeUrl}/policies/refund-policy`} style={{ color: "inherit", textDecoration: "none" }}>Refund policy</a>
                      <span style={{ margin: "0 10px", color: "#D9D9D9" }}>|</span>
                      <a href={`${storeUrl}/policies/privacy-policy`} style={{ color: "inherit", textDecoration: "none" }}>Privacy policy</a>
                      <span style={{ margin: "0 10px", color: "#D9D9D9" }}>|</span>
                      <a href={`${storeUrl}/policies/terms-of-service`} style={{ color: "inherit", textDecoration: "none" }}>Terms of service</a>
                    </div>
                    <a href={storeUrl} style={{ fontSize: "13px", color: "var(--text-primary)", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                      Continue shopping
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — sticky order summary, desktop only */}
        <div
          className="hidden lg:block lg:w-[42%] lg:sticky lg:top-0 lg:h-screen lg:overflow-auto"
          style={{ background: "var(--bg-right)", padding: "32px max(20px, 6%)", borderLeft: "1px solid var(--divider)" }}
        >
          <div className="mx-auto" style={{ maxWidth: "440px" }}>
            <OrderSummary
              lineItems={lineItems}
              subtotal={subtotal}
              shippingCost={shippingCost}
              discount={discount}
              currency={currency}
              loading={loading}
              promoCode={promoCode}
              promoApplied={promoApplied}
              promoError={promoError}
              onPromoCodeChange={setPromoCode}
              onApplyPromo={handleApplyPromo}
              open={summaryOpen}
              onToggle={setSummaryOpen}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
