"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface MerchantPublic {
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string;
  accent_color: string;
  store_url: string | null;
  store_name: string | null;
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber") || searchParams.get("orderName") || "";
  const urlOrderId = searchParams.get("orderId") || "";
  const paramEmail = searchParams.get("email") || "";
  const firstName = searchParams.get("firstName") || "";
  const total = searchParams.get("total") || "";
  const currency = searchParams.get("currency") || "EUR";

  const [merchantConfig, setMerchantConfig] = useState<MerchantPublic | null>(null);
  const [orderId, setOrderId] = useState(urlOrderId);
  const [displayNumber, setDisplayNumber] = useState(orderNumber);
  const [email, setEmail] = useState(paramEmail);
  const [loading, setLoading] = useState(!urlOrderId);
  const [error, setError] = useState("");

  const storeUrl = merchantConfig?.store_url || "/";
  const storeName = merchantConfig?.store_name || merchantConfig?.name || "Store";
  const brandColor = merchantConfig?.brand_color || "#111827";

  // Fetch merchant config
  useEffect(() => {
    fetch("/api/merchant")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setMerchantConfig(data);
      })
      .catch(() => {});
  }, []);

  // If no orderId in URL, try creating order from localStorage (redirect flow)
  useEffect(() => {
    if (urlOrderId) {
      localStorage.removeItem("pendingOrder");
      setLoading(false);
      return;
    }

    const createFromStorage = async () => {
      try {
        const stored = localStorage.getItem("pendingOrder");
        if (!stored) {
          setLoading(false);
          return;
        }

        const alreadyCreating = sessionStorage.getItem("orderCreating");
        if (alreadyCreating) {
          setLoading(false);
          return;
        }
        sessionStorage.setItem("orderCreating", "true");

        const orderData = JSON.parse(stored);
        if (orderData.email) setEmail(orderData.email);

        const res = await fetch("/api/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData),
        });

        const data = await res.json();
        console.log("[Confirmation] Response:", data);

        if (res.ok && data.orderId) {
          setOrderId(String(data.orderId));
          setDisplayNumber(data.orderName || `#${data.orderNumber}`);
          localStorage.removeItem("pendingOrder");
        } else {
          let errMsg = data.error || "Failed to create order";
          if (errMsg.length > 200 || errMsg.includes("<")) {
            errMsg = "An error occurred. Payment was received — contact support.";
          }
          setError(errMsg);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        sessionStorage.removeItem("orderCreating");
        setLoading(false);
      }
    };

    createFromStorage();
  }, [urlOrderId]);

  // Meta Pixel
  useEffect(() => {
    if (!orderId || !total) return;
    try {
      if ((window as any).fbq) {
        (window as any).fbq("track", "Purchase", { value: parseFloat(total), currency, content_type: "product" });
      }
    } catch {}
  }, [orderId, total, currency]);

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: "center", paddingTop: "100px" }}>
          <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 16px", display: "block" }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#333" strokeWidth="4" />
            <path className="opacity-75" fill="#333" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p style={{ fontSize: "14px", color: "#717171" }}>Creating your order...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ textAlign: "center", paddingTop: "80px", maxWidth: "480px", margin: "0 auto" }}>
          <div style={{ width: "64px", height: "64px", background: "#FEE2E2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "24px", color: "#DC2626" }}>!</div>
          <h1 style={{ fontSize: "20px", fontWeight: 600, color: "#111827", marginBottom: "8px" }}>Something went wrong</h1>
          <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "24px" }}>{error}</p>
          <a href={storeUrl} style={{ display: "inline-block", padding: "14px 32px", background: brandColor, color: "#FFF", borderRadius: "5px", textDecoration: "none", fontSize: "14px" }}>Return to store</a>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: "520px", width: "100%", margin: "0 auto", padding: "80px 24px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "64px", height: "64px", background: "#D1FAE5", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "28px", color: merchantConfig?.accent_color || "#059669" }}>{"✓"}</div>
          <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#111827", marginBottom: "8px" }}>Order confirmed!</h1>
          <p style={{ fontSize: "14px", color: "#6B7280" }}>Thank you{firstName ? `, ${firstName}` : ""}. Your order has been received.</p>
        </div>

        <div style={{ background: "#FFF", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "20px 24px", marginBottom: "16px" }}>
          <Row label="Order number" value={displayNumber || `#${orderId}`} />
          {total && <Row label="Order total" value={`${currency === "USD" ? "$" : currency === "GBP" ? "£" : "€"}${total}`} />}
          <Row label="Estimated delivery" value="3–5 business days" />
          {email && <Row label="Confirmation sent to" value={email} last />}
        </div>

        <p style={{ fontSize: "13px", color: "#6B7280", textAlign: "center", marginBottom: "24px" }}>
          A confirmation email has been sent to {email || "your email"}.
        </p>

        <a href={storeUrl} style={{ display: "block", width: "100%", background: brandColor, color: "#FFF", textAlign: "center", padding: "14px", borderRadius: "5px", fontSize: "15px", fontWeight: 500, textDecoration: "none" }}>
          Continue shopping
        </a>
      </div>
    </Layout>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: last ? 0 : "12px", borderBottom: last ? "none" : "1px solid #F3F4F6", marginBottom: last ? 0 : "12px" }}>
      <span style={{ fontSize: "13px", color: "#6B7280" }}>{label}</span>
      <span style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{value}</span>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "var(--font-inter), Inter, sans-serif" }}>{children}</div>;
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<Layout><div style={{ textAlign: "center", paddingTop: "100px", color: "#717171" }}>Loading...</div></Layout>}>
      <ConfirmationContent />
    </Suspense>
  );
}
