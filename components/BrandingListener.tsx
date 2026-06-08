"use client";

import { useEffect } from "react";

export default function BrandingListener() {
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type !== "BRANDING_UPDATE") return;
      const b = event.data.branding;
      if (!b) return;

      const root = document.documentElement;

      if (b.backgroundColor || b.pageBg) root.style.setProperty("--color-bg", b.backgroundColor || b.pageBg);
      if (b.primaryColor || b.primaryText) root.style.setProperty("--color-text", b.primaryColor || b.primaryText);
      if (b.buttonColor || b.ctaBg) root.style.setProperty("--color-button", b.buttonColor || b.ctaBg);
      if (b.ctaColor) root.style.setProperty("--color-button-text", b.ctaColor);
      if (b.buttonRadius || b.ctaRadius) {
        const r = typeof (b.buttonRadius || b.ctaRadius) === "number" ? `${b.buttonRadius || b.ctaRadius}px` : (b.buttonRadius || b.ctaRadius);
        root.style.setProperty("--btn-radius", r);
      }
      if (b.inputBorderRadius || b.inputRadius) {
        const r = typeof (b.inputBorderRadius || b.inputRadius) === "number" ? `${b.inputBorderRadius || b.inputRadius}px` : (b.inputBorderRadius || b.inputRadius);
        root.style.setProperty("--input-radius", r);
      }

      if (b.headingFont) {
        document.querySelectorAll("h1,h2,h3,.font-heading").forEach((el) => {
          (el as HTMLElement).style.fontFamily = `${b.headingFont}, sans-serif`;
        });
      }
      if (b.bodyFont) {
        document.body.style.fontFamily = `${b.bodyFont}, sans-serif`;
      }
      if (b.logoText) {
        document.querySelectorAll("h1").forEach((el) => {
          if (el.closest("header")) el.textContent = b.logoText;
        });
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}
