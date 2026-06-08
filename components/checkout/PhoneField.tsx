"use client";

const DIAL_CODES = [
  { code: "AE", dial: "+971", flag: "🇦🇪" },
  { code: "US", dial: "+1", flag: "🇺🇸" },
  { code: "CA", dial: "+1", flag: "🇨🇦" },
  { code: "GB", dial: "+44", flag: "🇬🇧" },
  { code: "DE", dial: "+49", flag: "🇩🇪" },
  { code: "FR", dial: "+33", flag: "🇫🇷" },
  { code: "AU", dial: "+61", flag: "🇦🇺" },
  { code: "NL", dial: "+31", flag: "🇳🇱" },
  { code: "IT", dial: "+39", flag: "🇮🇹" },
  { code: "ES", dial: "+34", flag: "🇪🇸" },
  { code: "AT", dial: "+43", flag: "🇦🇹" },
  { code: "CH", dial: "+41", flag: "🇨🇭" },
  { code: "SE", dial: "+46", flag: "🇸🇪" },
  { code: "NO", dial: "+47", flag: "🇳🇴" },
  { code: "DK", dial: "+45", flag: "🇩🇰" },
  { code: "BE", dial: "+32", flag: "🇧🇪" },
  { code: "IE", dial: "+353", flag: "🇮🇪" },
  { code: "JP", dial: "+81", flag: "🇯🇵" },
  { code: "SA", dial: "+966", flag: "🇸🇦" },
  { code: "EG", dial: "+20", flag: "🇪🇬" },
  { code: "LB", dial: "+961", flag: "🇱🇧" },
];

interface Props {
  dialCountry: string;
  number: string;
  onDialChange: (country: string) => void;
  onNumberChange: (number: string) => void;
}

export default function PhoneField({ dialCountry, number, onDialChange, onNumberChange }: Props) {
  const current = DIAL_CODES.find((c) => c.code === dialCountry) || DIAL_CODES[0];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px" }}>
      <div className="float-field">
        <input
          type="tel"
          inputMode="tel"
          value={number}
          onChange={(e) => onNumberChange(e.target.value.replace(/[^0-9+\-\s()]/g, ""))}
          placeholder=" "
        />
        <label>Telefono (opzionale)</label>
      </div>
      <div style={{ position: "relative" }}>
        <select
          value={dialCountry}
          onChange={(e) => onDialChange(e.target.value)}
          style={{
            height: "48px",
            padding: "0 28px 0 38px",
            fontSize: "14px",
            color: "var(--text)",
            background: "#FFFFFF",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            outline: "none",
            fontFamily: "inherit",
            WebkitAppearance: "none" as any,
            appearance: "none" as any,
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23717171' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 10px center",
          }}
          aria-label="Prefisso internazionale"
        >
          {DIAL_CODES.map((c) => (
            <option key={c.code} value={c.code}>{c.flag}  {c.dial}</option>
          ))}
        </select>
        <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "16px", pointerEvents: "none" }}>{current.flag}</span>
      </div>
    </div>
  );
}

export function dialFor(country: string): string {
  return (DIAL_CODES.find((c) => c.code === country) || DIAL_CODES[0]).dial;
}
