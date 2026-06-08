"use client";

import FloatingInput from "./FloatingInput";
import PhoneField from "./PhoneField";

interface Props {
  email: string;
  phoneCountry: string;
  phoneNumber: string;
  marketingOptIn: boolean;
  onEmailChange: (v: string) => void;
  onPhoneCountryChange: (v: string) => void;
  onPhoneNumberChange: (v: string) => void;
  onMarketingChange: (v: boolean) => void;
}

export default function ContactForm({
  email,
  phoneCountry,
  phoneNumber,
  marketingOptIn,
  onEmailChange,
  onPhoneCountryChange,
  onPhoneNumberChange,
  onMarketingChange,
}: Props) {
  return (
    <section>
      <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>Contact</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <FloatingInput label="Email" value={email} onChange={onEmailChange} type="email" required />
        <PhoneField
          dialCountry={phoneCountry}
          number={phoneNumber}
          onDialChange={onPhoneCountryChange}
          onNumberChange={onPhoneNumberChange}
        />
        <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "var(--text)", cursor: "pointer", marginTop: "4px" }}>
          <input
            type="checkbox"
            className="ck"
            checked={marketingOptIn}
            onChange={(e) => onMarketingChange(e.target.checked)}
          />
          <span>Subscribe for exclusive offers and updates</span>
        </label>
      </div>
    </section>
  );
}
