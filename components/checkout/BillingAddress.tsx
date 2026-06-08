"use client";

interface Props {
  sameAsShipping: boolean;
  onChange: (v: boolean) => void;
}

export default function BillingAddress({ sameAsShipping, onChange }: Props) {
  return (
    <section>
      <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>Billing address</h2>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          background: "#FFF",
          fontSize: "14px",
          color: "var(--text)",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          className="ck"
          checked={sameAsShipping}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>Same as shipping address</span>
      </label>
    </section>
  );
}
