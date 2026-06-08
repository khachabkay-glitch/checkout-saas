"use client";

import { useState } from "react";
import Image from "next/image";

interface LineItem { variantId: string; productTitle: string; variantTitle: string; quantity: number; price: number; originalPrice?: number; currency: string; image: string; }
interface Props {
  lineItems: LineItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  currency: string;
  loading: boolean;
  promoCode: string;
  promoApplied: string;
  promoError: string;
  onPromoCodeChange: (v: string) => void;
  onApplyPromo: () => void;
  /** When provided, the mobile accordion's open/close state is controlled by the parent.
   *  This lets the page render the accordion in two places that share state. */
  open?: boolean;
  onToggle?: (v: boolean) => void;
  /** Hide the desktop heading + always-on body — for mobile-only accordion instances. */
  mobileOnly?: boolean;
}

const CURRENCY_SYMBOL: Record<string, string> = {
  EUR: "€", USD: "$", GBP: "£", CAD: "C$", AUD: "A$", AED: "AED ", SAR: "SAR ",
};

function fmt(n: number, c: string) {
  const sym = CURRENCY_SYMBOL[c] || "";
  const sign = n < 0 ? "-" : "";
  return `${sign}${sym}${Math.abs(n).toFixed(2)}`;
}

export default function OrderSummary({
  lineItems, subtotal, shippingCost, discount, currency, loading,
  promoCode, promoApplied, promoError, onPromoCodeChange, onApplyPromo,
  open: openProp, onToggle, mobileOnly = false,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp !== undefined ? openProp : internalOpen;
  const setOpen = (v: boolean) => {
    if (onToggle) onToggle(v);
    else setInternalOpen(v);
  };
  const total = Math.max(0, subtotal + shippingCost - discount);

  if (loading) {
    return (
      <div>
        {[1, 2].map((i) => <div key={i} className="sk" style={{ height: "64px", borderRadius: "8px", background: "#EEEDEA", marginBottom: "12px" }} />)}
        <div className="sk" style={{ height: "120px", borderRadius: "8px", background: "#EEEDEA" }} />
      </div>
    );
  }

  const totalItems = lineItems.reduce((s, i) => s + i.quantity, 0);

  const desktopBodyClass = mobileOnly ? "" : "lg:block";
  const bodyVisible = open || (!mobileOnly);

  return (
    <>
      <button
        type="button"
        className={mobileOnly ? "flex items-center justify-between w-full" : "lg:hidden flex items-center justify-between w-full"}
        style={{
          padding: "14px 16px",
          background: "var(--bg-right)",
          border: "1px solid var(--border-light)",
          borderRadius: "8px",
          fontFamily: "inherit",
        }}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span style={{ fontSize: "14px", color: "var(--text)", display: "flex", alignItems: "center", gap: "8px", fontWeight: 500 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
          Order summary
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9" /></svg>
        </span>
        <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>{fmt(total, currency)}</span>
      </button>

      <div className={`${bodyVisible ? "block" : "hidden"} ${desktopBodyClass}`} style={{ marginTop: bodyVisible ? "16px" : 0 }}>
        {!mobileOnly && (
          <h2 className="hidden lg:block" style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "16px" }}>Order summary</h2>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "16px" }}>
          {lineItems.map((item) => (
            <div key={item.variantId} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div style={{ position: "relative", width: "56px", height: "56px", borderRadius: "8px", border: "1px solid var(--border-light)", overflow: "hidden", background: "#FFF", flexShrink: 0 }}>
                {item.image ? (
                  <Image src={item.image} alt={item.productTitle} fill className="object-cover" sizes="56px" />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#CCC" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                  </div>
                )}
                {item.quantity > 1 && (
                  <span style={{ position: "absolute", top: "-6px", right: "-6px", width: "20px", height: "20px", borderRadius: "50%", background: "var(--text-muted)", color: "#FFF", fontSize: "11px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {item.quantity}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.productTitle}</p>
                {item.variantTitle && item.variantTitle !== "Default Title" && (
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{item.variantTitle}</p>
                )}
              </div>
              {(() => {
                const lineTotal = item.price * item.quantity;
                const lineOriginal = (item.originalPrice ?? item.price) * item.quantity;
                const discounted = item.originalPrice !== undefined && lineOriginal > lineTotal + 0.001;
                return (
                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                    {discounted && (
                      <p style={{ fontSize: "12px", color: "var(--text-muted)", textDecoration: "line-through", lineHeight: 1.2 }}>{fmt(lineOriginal, currency)}</p>
                    )}
                    <p style={{ fontSize: "13px", fontWeight: 500, color: discounted ? "var(--success)" : "var(--text)", lineHeight: 1.3 }}>
                      {discounted && lineTotal === 0 ? "FREE" : fmt(lineTotal, currency)}
                    </p>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => onPromoCodeChange(e.target.value)}
              placeholder="Discount code"
              style={{
                width: "100%", height: "44px", padding: "0 13px",
                fontSize: "13px", color: "var(--text)", background: "#FFF",
                border: "1px solid var(--border)", borderRadius: "8px", outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>
          <button
            type="button"
            onClick={onApplyPromo}
            disabled={!promoCode.trim()}
            style={{
              padding: "0 18px", height: "44px",
              fontSize: "13px", fontWeight: 600,
              color: promoCode.trim() ? "var(--text)" : "var(--text-muted)",
              background: "#FFF",
              border: "1px solid var(--border)", borderRadius: "8px",
              cursor: promoCode.trim() ? "pointer" : "not-allowed",
              fontFamily: "inherit",
            }}
          >
            Apply
          </button>
        </div>
        {promoError && (
          <p style={{ fontSize: "12px", color: "var(--error)", marginTop: "-8px", marginBottom: "12px" }}>{promoError}</p>
        )}

        <div style={{ borderTop: "1px solid var(--divider)", paddingTop: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "14px", color: "var(--text)" }}>Subtotal · {totalItems} item{totalItems !== 1 ? "s" : ""}</span>
            <span style={{ fontSize: "14px", color: "var(--text)" }}>{fmt(subtotal, currency)}</span>
          </div>
          {discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "14px", color: "var(--text)" }}>
                Discount{promoApplied ? ` · ${promoApplied}` : ""}
              </span>
              <span style={{ fontSize: "14px", color: "var(--success)" }}>{fmt(-discount, currency)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>Shipping</span>
            <span style={{ fontSize: "14px", color: shippingCost === 0 ? "var(--text-muted)" : "var(--text)" }}>
              {shippingCost === 0 ? "FREE" : fmt(shippingCost, currency)}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--divider)", paddingTop: "16px" }}>
            <span style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)" }}>Total</span>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", marginRight: "6px" }}>{currency}</span>
              <span style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)" }}>{fmt(total, currency)}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
