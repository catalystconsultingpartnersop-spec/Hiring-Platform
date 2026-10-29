"use client";

import { useActionState, useState } from "react";
import { assignRep, FormState } from "../../actions";

// A small dropdown that saves as soon as Heshy picks a rep.
export function RepPicker(p: { candidateId: string; value: string; options: [string, string][]; note?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(assignRep.bind(null, p.candidateId), {});
  // Controlled, so the choice stays showing after the save (forms reset themselves).
  const [value, setValue] = useState(p.value);
  return (
    <form action={action} style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <select
        className="select"
        name="rep"
        aria-label="Rep"
        value={value}
        disabled={pending}
        onChange={(e) => {
          setValue(e.currentTarget.value);
          e.currentTarget.form?.requestSubmit();
        }}
        style={{ minHeight: 36, padding: "4px 30px 4px 10px", fontSize: 14, width: "auto" }}
      >
        <option value="">Not assigned</option>
        {p.options.map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
      {pending ? (
        <span className="small muted">Saving…</span>
      ) : state.error ? (
        <span className="small" style={{ color: "var(--rust)" }}>{state.error}</span>
      ) : state.ok ? (
        <span className="small" style={{ color: "var(--moss)" }}>Saved</span>
      ) : p.note ? (
        <span className="small muted">{p.note}</span>
      ) : null}
    </form>
  );
}
