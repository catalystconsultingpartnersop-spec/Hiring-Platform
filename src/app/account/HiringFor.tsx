"use client";

import { useActionState } from "react";
import { saveOwnerPosition, closeOwnerPosition, type SetupState } from "./actions";

// "Hiring for something specific?" Optional. We use it only to point out candidates who fit.
export function HiringFor({ positions }: { positions: { id: string; title: string; location: string | null }[] }) {
  const [state, action, pending] = useActionState<SetupState, FormData>(saveOwnerPosition, {});
  return (
    <section className="panel" id="hiring" style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 20, margin: 0 }}>Hiring for something specific?</h2>
      <p className="small muted" style={{ margin: "4px 0 12px" }}>
        Tell us, and we&rsquo;ll quietly point out candidates who fit. Totally optional, and never shown to anyone.
      </p>
      {positions.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px" }}>
          {positions.map((p) => (
            <li key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--line)" }}>
              <span>
                <b>{p.title}</b>
                {p.location ? <span className="muted"> · {p.location}</span> : null}
              </span>
              <form action={closeOwnerPosition.bind(null, p.id)}>
                <button className="btn btn-ghost btn-small" type="submit">
                  Filled
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form action={action} style={{ display: "grid", gap: 8, maxWidth: 520 }}>
        <input className="input" name="title" placeholder="Position, e.g. Office manager" required />
        <input className="input" name="location" placeholder="Where, e.g. Brooklyn NY" />
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input" name="salary_min" placeholder="Pay from, e.g. 60k" inputMode="numeric" />
          <input className="input" name="salary_max" placeholder="Pay up to, e.g. 75k" inputMode="numeric" />
        </div>
        <input className="input" name="needs" placeholder="What matters most in this person" />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn btn-gold btn-small" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
          {state.error && <span className="small" style={{ color: "var(--rust)" }}>{state.error}</span>}
        </div>
      </form>
    </section>
  );
}
