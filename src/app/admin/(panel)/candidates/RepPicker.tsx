"use client";

import { useState, useTransition } from "react";
import { assignRep, FormState } from "../../actions";

// A small dropdown that saves as soon as Heshy picks a rep. It calls the save
// directly (not through a form), so nothing resets the choice after saving.
export function RepPicker(p: { candidateId: string; value: string; options: [string, string][]; note?: string; compact?: boolean }) {
  const [value, setValue] = useState(p.value);
  const [state, setState] = useState<FormState>({});
  const [pending, start] = useTransition();
  const [notify, setNotify] = useState(false);
  const [moveCalls, setMoveCalls] = useState(true);

  function pick(next: string) {
    const before = value;
    setValue(next);
    setState({});
    start(async () => {
      const fd = new FormData();
      fd.set("rep", next);
      if (notify) fd.set("notify", "on");
      if (moveCalls) fd.set("move_calls", "on");
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

  const checks = (
    <>
      <label className="small" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Email the candidate about the change
      </label>
      <label className="small" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <input type="checkbox" checked={moveCalls} onChange={(e) => setMoveCalls(e.target.checked)} /> Move their upcoming call too
      </label>
    </>
  );

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
      {p.compact ? (
        <details className="small">
          <summary className="muted" style={{ cursor: "pointer" }}>Options before changing</summary>
          {checks}
        </details>
      ) : (
        checks
      )}
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
