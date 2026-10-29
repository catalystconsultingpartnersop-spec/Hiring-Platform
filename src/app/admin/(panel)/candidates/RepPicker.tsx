"use client";

import { useState, useTransition } from "react";
import { assignRep, FormState } from "../../actions";

// A small dropdown that saves as soon as Heshy picks a rep. It calls the save
// directly (not through a form), so nothing resets the choice after saving.
export function RepPicker(p: { candidateId: string; value: string; options: [string, string][]; note?: string }) {
  const [value, setValue] = useState(p.value);
  const [state, setState] = useState<FormState>({});
  const [pending, start] = useTransition();

  function pick(next: string) {
    const before = value;
    setValue(next);
    setState({});
    start(async () => {
      const fd = new FormData();
      fd.set("rep", next);
      try {
        const r = await assignRep(p.candidateId, {}, fd);
        if (r.error) setValue(before);
        setState(r);
      } catch {
        setValue(before);
        setState({ error: "Couldn't save. Try again." });
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <select
        className="select"
        aria-label="Rep"
        value={value}
        disabled={pending}
        onChange={(e) => pick(e.currentTarget.value)}
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
        <span className="small" style={{ color: "var(--moss)" }}>{state.ok}</span>
      ) : p.note ? (
        <span className="small muted">{p.note}</span>
      ) : null}
    </span>
  );
}
