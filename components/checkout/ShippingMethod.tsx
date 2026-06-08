"use client";

interface Rate { handle: string; title: string; price: string; }
interface Props { rates: Rate[]; selected: string; loading: boolean; onSelect: (h: string) => void; currency: string; }

const CURRENCY_SYMBOL: Record<string, string> = {
  EUR: "€", USD: "$", GBP: "£", CAD: "C$", AUD: "A$", AED: "AED ", SAR: "SAR ",
};

export default function ShippingMethod({ rates, selected, loading, onSelect, currency }: Props) {
  const heading = <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>Shipping method</h2>;
  const sym = CURRENCY_SYMBOL[currency] || "";

  if (loading) {
    return <section>{heading}<div className="sk" style={{ height: "64px", borderRadius: "8px", background: "#F3F4F6" }} /></section>;
  }

  if (!rates.length) {
    return <section>{heading}<p style={{ fontSize: "13px", color: "var(--text-muted)", padding: "16px", border: "1px solid var(--border)", borderRadius: "8px", background: "#FAFAFA" }}>Enter your shipping address to see available methods.</p></section>;
  }

  return (
    <section>
      {heading}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {rates.map((r) => {
          const on = selected === r.handle;
          const isFree = parseFloat(r.price) === 0;
          return (
            <button key={r.handle} type="button" onClick={() => onSelect(r.handle)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
                padding: "16px", borderRadius: "8px", cursor: "pointer", textAlign: "left",
                border: on ? "2px solid var(--text)" : "1px solid var(--border)",
                background: on ? "#FAFAFA" : "#FFF",
                fontFamily: "inherit",
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{
                  width: "20px", height: "20px", borderRadius: "50%",
                  border: `2px solid ${on ? "var(--text)" : "#D9D9D9"}`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {on && <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--text)" }} />}
                </span>
                <span style={{ fontSize: "14px", color: "var(--text)" }}>{r.title}</span>
              </div>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
                {isFree ? "FREE" : `${sym}${parseFloat(r.price).toFixed(2)}`}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
