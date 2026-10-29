"use client";

import { useState } from "react";

// Default percent, a custom percent, or a flat amount per hire.
export function CommissionFields({
  defaultPercent,
  type,
  value,
  note,
}: {
  defaultPercent: number;
  type?: "percent" | "flat" | null;
  value?: number | null;
  note?: string | null;
}) {
  const [t, setT] = useState<string>(type ?? "default");
  return (
    <fieldset style={{ border: 0, padding: 0, margin: "14px 0 0" }}>
      <legend style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Commission</legend>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <select className="select" name="commission_type" value={t} onChange={(e) => setT(e.target.value)} style={{ maxWidth: 280 }}>
          <option value="default">Standard: {defaultPercent}% of each fee</option>
          <option value="percent">A different percent of each fee</option>
          <option value="flat">A flat amount per hire</option>
        </select>
        {t !== "default" && (
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {t === "flat" && <span>$</span>}
            <input
              className="input"
              name="commission_value"
              inputMode="decimal"
              defaultValue={value ?? ""}
              placeholder={t === "flat" ? "750" : "15"}
              style={{ width: 110 }}
              required
            />
            <span>{t === "flat" ? "per hire" : "% of each fee"}</span>
          </label>
        )}
      </div>
      <label className="field" style={{ marginTop: 10 }}>
        <span>Anything else about their terms (optional, they&rsquo;ll see this)</span>
        <input className="input" name="commission_note" defaultValue={note ?? ""} placeholder="e.g. Bonus of $500 after 5 hires" />
      </label>
    </fieldset>
  );
}
