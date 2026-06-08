"use client";

import { useEffect, useCallback } from "react";

interface Branding {
  storeName?: string;
  logoText?: string;
  primaryColor?: string;
  backgroundColor?: string;
  fontHeading?: string;
  fontBody?: string;
  buttonText?: string;
  buttonRadius?: string;
}

function applyBranding(b: Branding) {
  const root = document.documentElement;

  if (b.backgroundColor) root.style.setProperty("--bg-right", b.backgroundColor);
  if (b.primaryColor) {
    root.style.setProperty("--btn-bg", b.primaryColor);
    root.style.setProperty("--border-focus", b.primaryColor);
  }
  if (b.buttonText) root.style.setProperty("--btn-text", b.buttonText);
  if (b.buttonRadius) root.style.setProperty("--btn-radius", b.buttonRadius);

  if (b.fontHeading) {
    document.querySelectorAll("h1, h2, h3").forEach((el) => {
      (el as HTMLElement).style.fontFamily = `${b.fontHeading}, sans-serif`;
    });
  }
  if (b.fontBody) {
    document.body.style.fontFamily = `${b.fontBody}, sans-serif`;
  }
  if (b.logoText) {
    document.querySelectorAll("h1").forEach((el) => {
      if (el.closest("header") || el.textContent?.match(/^[A-Z\s]+$/)) {
        el.textContent = b.logoText!;
      }
    });
  }
}

export default function BrandingSync() {
  const osUrl = process.env.NEXT_PUBLIC_CHECKOUT_OS_URL;
  const storeId = process.env.NEXT_PUBLIC_STORE_ID;

  const fetchBranding = useCallback(async () => {
    if (!osUrl || !storeId) return;
    try {
      const res = await fetch(`${osUrl}/api/stores/${storeId}/branding`, { cache: "no-store" });
      if (res.ok) {
        const branding = await res.json();
        applyBranding(branding);
      }
    } catch {}
  }, [osUrl, storeId]);

  useEffect(() => {
    if (!osUrl || !storeId) return;

    // Initial fetch
    fetchBranding();

    // SSE for real-time updates
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`${osUrl}/api/stores/${storeId}/branding/stream`);
      eventSource.onmessage = (event) => {
        try {
          const branding = JSON.parse(event.data);
          applyBranding(branding);
        } catch {}
      };
      eventSource.onerror = () => {
        // Fallback to polling if SSE fails
        eventSource?.close();
        eventSource = null;
      };
    } catch {}

    // Fallback polling every 30s if SSE not available
    const interval = setInterval(fetchBranding, 30000);

    // Also listen for postMessage (from dashboard editor iframe)
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "BRANDING_UPDATE") {
        applyBranding(event.data.branding);
      }
    }
    window.addEventListener("message", handleMessage);

    return () => {
      clearInterval(interval);
      eventSource?.close();
      window.removeEventListener("message", handleMessage);
    };
  }, [osUrl, storeId, fetchBranding]);

  return null;
}
