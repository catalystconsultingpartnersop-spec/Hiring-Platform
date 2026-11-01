"use client";

import { useState, useTransition } from "react";
import { FormState, ReminderKind, sendCandidateReminder } from "../../actions";

export type ReminderOption = { kind: ReminderKind; label: string; hint: string; lastSent: string | null };

// One-click, friendly reminders, so the rep never has to chase anyone personally.
export function Reminders({ candidateId, first, options }: { candidateId: string; first: string; options: ReminderOption[] }) {
  const [state, setState] = useState<FormState & { kind?: ReminderKind }>({});
  const [busy, setBusy] = useState<ReminderKind | null>(null);
  const [, start] = useTransition();
  const send = (kind: ReminderKind) => {
    setBusy(kind);
    setState({});
    start(async () => {
      try {
        setState({ ...(await sendCandidateReminder(candidateId, kind)), kind });
      } catch {
        setState({ error: "Couldn't send. Try again.", kind });
      } finally {
        setBusy(null);
      }
    });
  };
  if (!options.length) return null;
  return (
    <section className="panel" style={{ marginTop: 16 }}>
      <h2 style={{ fontSize: 18, margin: 0 }}>Send {first} a reminder</h2>
      <p className="small muted" style={{ margin: "4px 0 12px" }}>
        A short, friendly email from you. Their replies come straight to your inbox.
      </p>
      <div style={{ display: "grid", gap: 10 }}>
        {options.map((o) => (
          <div key={o.kind} style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", borderTop: "1px solid var(--wash)", paddingTop: 10 }}>
            <div style={{ minWidth: 0, flex: "1 1 240px" }}>
              <strong>{o.label}</strong>
              <div className="small muted">
                {o.hint}
                {o.lastSent ? ` Last sent ${o.lastSent}.` : ""}
              </div>
              {state.kind === o.kind && (state.ok || state.error) && (
                <div className="small" style={{ marginTop: 4, color: state.ok ? "var(--moss)" : "var(--rust)" }} role="status">
                  {state.ok ?? state.error}
                </div>
              )}
            </div>
            <button className="btn btn-ghost btn-small" type="button" disabled={busy !== null} onClick={() => send(o.kind)}>
              {busy === o.kind ? "Sending…" : "Send reminder"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
