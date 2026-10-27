"use client";

import { useActionState } from "react";
import { GuidedState, requestGuidedHiring } from "./actions";

const OPTIONS: [string, string][] = [
  ["interview", "Interview prep and sitting in"],
  ["offer", "Making the offer and negotiating"],
  ["paperwork", "Paperwork and day-one setup"],
  ["onboarding", "First 90 days plan and check-ins"],
];

export function GuidedForm({ candidates, phone }: { candidates: { id: string; name: string }[]; phone: string }) {
  const [state, action, pending] = useActionState<GuidedState, FormData>(requestGuidedHiring, {});
  if (state.ok)
    return (
      <p className="notice notice-good" role="status" style={{ margin: 0 }}>
        Thanks. We&rsquo;ll be in touch within one business day with a flat price before anything starts.
      </p>
    );
  return (
    <form action={action} style={{ display: "grid", gap: 10 }}>
      <strong>What would you like help with?</strong>
      {OPTIONS.map(([k, label]) => (
        <label key={k} className="check">
          <input type="checkbox" name={k} />
          <span>{label}</span>
        </label>
      ))}
      {candidates.length > 0 && (
        <label className="field">
          <span>For which candidate? (optional)</span>
          <select className="select" name="candidate" defaultValue="">
            <option value="">Not sure yet</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="field">
        <span>Anything else? (optional)</span>
        <textarea className="textarea" name="message" style={{ minHeight: 70 }} />
      </label>
      <label className="field">
        <span>Best phone number</span>
        <input className="input" name="phone" defaultValue={phone} />
      </label>
      {state.error && (
        <p className="notice notice-bad" role="alert" style={{ margin: 0 }}>
          {state.error}
        </p>
      )}
      <button className="btn btn-gold" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Ask about guided hiring"}
      </button>
    </form>
  );
}
