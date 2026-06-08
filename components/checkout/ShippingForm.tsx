"use client";

import FloatingInput, { FloatingSelect } from "./FloatingInput";

export interface ShippingAddress {
  firstName: string; lastName: string; address1: string; address2: string;
  city: string; province: string; country: string; zip: string;
}

interface Props { address: ShippingAddress; onChange: (a: ShippingAddress) => void; }

const COUNTRIES = [
  { value: "IT", label: "Italy" }, { value: "DE", label: "Germany" },
  { value: "FR", label: "France" }, { value: "ES", label: "Spain" },
  { value: "AT", label: "Austria" }, { value: "CH", label: "Switzerland" },
  { value: "NL", label: "Netherlands" }, { value: "BE", label: "Belgium" },
  { value: "GB", label: "United Kingdom" }, { value: "SE", label: "Sweden" },
  { value: "NO", label: "Norway" }, { value: "DK", label: "Denmark" },
  { value: "IE", label: "Ireland" }, { value: "US", label: "United States" },
  { value: "CA", label: "Canada" }, { value: "AU", label: "Australia" },
  { value: "AE", label: "United Arab Emirates" }, { value: "SA", label: "Saudi Arabia" },
  { value: "EG", label: "Egypt" }, { value: "LB", label: "Lebanon" },
  { value: "JP", label: "Japan" },
];

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const CA_PROVINCES = ["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"];
const AE_EMIRATES = ["Abu Dhabi","Ajman","Dubai","Fujairah","Ras Al Khaimah","Sharjah","Umm Al Quwain"];

function provinceOptions(country: string): { value: string; label: string }[] | null {
  if (country === "US") return US_STATES.map((s) => ({ value: s, label: s }));
  if (country === "CA") return CA_PROVINCES.map((s) => ({ value: s, label: s }));
  if (country === "AE") return AE_EMIRATES.map((s) => ({ value: s, label: s }));
  return null;
}

export default function ShippingForm({ address, onChange }: Props) {
  const u = (field: keyof ShippingAddress, value: string) => onChange({ ...address, [field]: value });
  const provinces = provinceOptions(address.country);

  return (
    <section>
      <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>Shipping</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <FloatingSelect label="Country" value={address.country} onChange={(v) => u("country", v)} options={COUNTRIES} />
        <div className="grid-responsive">
          <FloatingInput label="First name" value={address.firstName} onChange={(v) => u("firstName", v)} required />
          <FloatingInput label="Last name" value={address.lastName} onChange={(v) => u("lastName", v)} required />
        </div>
        <FloatingInput label="Address" value={address.address1} onChange={(v) => u("address1", v)} required />
        <FloatingInput label="Apartment, suite, etc. (optional)" value={address.address2} onChange={(v) => u("address2", v)} />
        <FloatingInput label="City" value={address.city} onChange={(v) => u("city", v)} required />
        <div className="grid-responsive">
          {provinces ? (
            <FloatingSelect label="State/Province" value={address.province} onChange={(v) => u("province", v)} options={provinces} />
          ) : (
            <FloatingInput label="State/Province" value={address.province} onChange={(v) => u("province", v)} />
          )}
          <FloatingInput label="ZIP code" value={address.zip} onChange={(v) => u("zip", v)} required />
        </div>
      </div>
    </section>
  );
}
