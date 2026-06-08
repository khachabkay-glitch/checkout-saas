"use client";

import { useState, useEffect, useMemo, forwardRef, useRef } from "react";
import { WhopCheckoutEmbed } from "@whop/checkout/react";

interface PaymentSectionProps {
  sessionId: string;
  sessionToken: string;
  total: number;
  currency: string;
  disabled: boolean;
  whopPlanId: string;
  whopCheckoutSessionId: string;
  customerInfo: {
    email: string;
    phone: string;
    shippingAddress: any;
    shippingMethod: any;
    shippingCost: number;
  };
  lineItems: any[];
  subtotal: number;
  onPaymentComplete: (paymentId: string) => void;
  onError: (error: string) => void;
  onReady?: () => void;
}

export type WhopEmbedRef = {
  submit: () => Promise<void>;
} | null;

const PaymentSection = forwardRef<any, PaymentSectionProps>(function PaymentSection(
  {
    whopPlanId,
    whopCheckoutSessionId,
    customerInfo,
    lineItems,
    subtotal,
    currency,
    onPaymentComplete,
    onError,
    onReady,
  },
  ref,
) {
  const [embedReady, setEmbedReady] = useState(false);
  const submitPendingRef = useRef(false);

  useEffect(() => {
    if (ref && typeof ref === "object" && "current" in ref && ref.current) {
      (ref.current as any).__setSubmitPending = (val: boolean) => {
        submitPendingRef.current = val;
      };
    }
  });

  useEffect(() => {
    if (!customerInfo.email || !lineItems?.length) return;
    const orderData = {
      paymentId: whopCheckoutSessionId || whopPlanId,
      email: customerInfo.email,
      phone: customerInfo.phone,
      shippingAddress: customerInfo.shippingAddress,
      shippingMethod: customerInfo.shippingMethod,
      shippingCost: customerInfo.shippingCost,
      lineItems,
      subtotal,
      currency,
    };
    try { localStorage.setItem("pendingOrder", JSON.stringify(orderData)); } catch {}
  }, [customerInfo, lineItems, subtotal, currency, whopCheckoutSessionId, whopPlanId]);

  const prefill = useMemo(() => ({
    email: customerInfo.email || undefined,
    address: customerInfo.shippingAddress ? {
      name: `${customerInfo.shippingAddress.firstName || ""} ${customerInfo.shippingAddress.lastName || ""}`.trim() || undefined,
      country: customerInfo.shippingAddress.country || undefined,
      line1: customerInfo.shippingAddress.address1 || undefined,
      line2: customerInfo.shippingAddress.address2 || undefined,
      city: customerInfo.shippingAddress.city || undefined,
      state: customerInfo.shippingAddress.province || undefined,
      postalCode: customerInfo.shippingAddress.zip || undefined,
    } : undefined,
  }), [customerInfo.email, customerInfo.shippingAddress]);

  if (!whopCheckoutSessionId) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px", border: "1px solid var(--border)", borderRadius: "8px", background: "#FAFAFA" }}>
        <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginRight: "10px" }}>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#666" strokeWidth="4" />
          <path className="opacity-75" fill="#666" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Preparing checkout...</span>
      </div>
    );
  }

  return (
    <div className="whop-embed-clip">
      {!embedReady && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px", border: "1px solid var(--border)", borderRadius: "8px", marginBottom: "8px" }}>
          <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginRight: "10px" }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#333" strokeWidth="4" />
            <path className="opacity-75" fill="#333" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Loading payment...</span>
        </div>
      )}
      <WhopCheckoutEmbed
        ref={ref as any}
        sessionId={whopCheckoutSessionId}
        theme="light"
        skipRedirect
        hidePrice
        prefill={prefill}
        onComplete={(sessionOrPlanId, receiptOrSetupIntent) => {
          console.log("[Whop] onComplete fired:", { sessionOrPlanId, receiptOrSetupIntent });
          submitPendingRef.current = false;
          onPaymentComplete(receiptOrSetupIntent || whopCheckoutSessionId || sessionOrPlanId);
        }}
        onStateChange={(state) => {
          console.log("[Whop] State changed:", state, "submitPending:", submitPendingRef.current);
          if (state === "ready") {
            setEmbedReady(true);
            onReady?.();
            if (submitPendingRef.current) {
              submitPendingRef.current = false;
              console.error("[Whop] Payment failed — embed returned to ready state after submit");
              onError("Payment declined. Please check your card details and try again.");
            }
          }
        }}
        onAddressValidationError={(err) => {
          console.error("[Whop] Address validation error:", err);
          submitPendingRef.current = false;
          onError(err?.error_message || "Unable to verify address.");
        }}
        fallback={<></>}
      />
    </div>
  );
});

export default PaymentSection;
