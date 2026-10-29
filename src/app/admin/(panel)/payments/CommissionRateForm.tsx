"use client";

import { useState, useTransition } from "react";
import { FormState, setCommissionPercent } from "../../actions";

// Saves without a form reset, so the new number stays in the box.
export function CommissionRateForm({ pct }: { pct: number }) {
  const [value, setValue] = useState(String(pct));
  const [state, setState] = useState<FormState>({});
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setState({});
        start(async () => {
          const fd = new FormData();
          fd.set("percent", value);
          try {
            setState(await setCommissionPercent({}, fd));
          } catch {
            setState({ error: "Couldn't save. Try again." });
          }
        });
      }}
      style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}
    >
      <span className="small muted">Standard commission for reps without their own terms:</span>
      <input
        className="input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode="decimal"
        aria-label="Commission percent"
        style={{ width: 90, padding: "6px 8px" }}
      />
      <span className="small">% of the fee</span>
      <button className="btn btn-small btn-ghost" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
      {state.ok && !pending && <span className="small" style={{ color: "var(--moss)" }}>{state.ok}</span>}
      {state.error && !pending && <span className="small" style={{ color: "var(--rust)" }}>{state.error}</span>}
    </form>
  );
}
