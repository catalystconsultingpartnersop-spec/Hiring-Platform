"use client";

import { CAND_PCT, FINDER_PCT } from "@/lib/split";

// Everyone is on the same split now (30% candidate, 30% owner).
/* eslint-disable @typescript-eslint/no-unused-vars */
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
  return (
    <fieldset style={{ border: 0, padding: 0, margin: "14px 0 0" }}>
      <legend style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Commission</legend>
      <input type="hidden" name="commission_type" value="default" />
      <p className="small" style={{ margin: 0 }}>
        Same for everyone: <b>{CAND_PCT}%</b> of the fee for a candidate they bring in, plus <b>{FINDER_PCT}%</b> for a business owner they bring in.
      </p>
      <label className="field" style={{ marginTop: 10 }}>
        <span>Anything else about their terms (optional, they&rsquo;ll see this)</span>
        <input className="input" name="commission_note" defaultValue={note ?? ""} placeholder="e.g. Bonus of $500 after 5 hires" />
      </label>
    </fieldset>
  );
}
