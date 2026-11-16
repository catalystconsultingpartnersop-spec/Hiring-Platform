"use client";

import { useState, useTransition } from "react";
import { assignRep, callPlanInfo, type CallPlanInfo, FormState } from "../../actions";

// A small dropdown that saves as soon as Heshy picks a rep. It calls the save
// directly (not through a form), so nothing resets the choice after saving.
export function RepPicker(p: { candidateId: string; value: string; options: [string, string][]; note?: string; compact?: boolean }) {
  const [value, setValue] = useState(p.value);
  const [state, setState] = useState<FormState>({});
  const [pending, start] = useTransition();
  const [notify, setNotify] = useState(false);
  const [ask, setAsk] = useState<{ next: string; info: NonNullable<CallPlanInfo> } | null>(null);
  const [plan, setPlan] = useState<"keep" | "rebook" | "stay">("keep");
  const nameOf = (id: string) => (p.options.find(([v]) => v === id)?.[1] ?? "the new rep").split(" ")[0];

  function save(next: string, callPlan: "keep" | "rebook" | "stay") {
    const before = value;
    setValue(next);
    setState({});
    setAsk(null);
    start(async () => {
      const fd = new FormData();
      fd.set("rep", next);
      if (notify) fd.set("notify", "on");
      fd.set("call_plan", callPlan);
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

  // If a call is already booked with someone else, ask what to do with it first.
  function pick(next: string) {
    setState({});
    start(async () => {
      const info = next ? await callPlanInfo(p.candidateId, next).catch(() => null) : null;
      if (!info) return save(next, "keep");
      setPlan("keep");
      setAsk({ next, info });
    });
  }

  const checks = (
    <>
      <label className="small" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Email the candidate about the change
      </label>
    </>
  );

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <select
        className="select"
        aria-label="Rep"
        value={ask ? ask.next : value}
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
      {ask && (
        <span style={{ flex: "1 1 100%", display: "grid", gap: 8, padding: "12px 14px", border: "1.5px solid var(--marigold)", borderRadius: 12, background: "#fffaf0", fontSize: 14.5 }}>
          <b>
            A call is booked with {ask.info.with} for {ask.info.when}. What should happen to it?
          </b>
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontWeight: 400, margin: 0 }}>
            <input type="radio" name={`plan-${p.candidateId}`} checked={plan === "keep"} onChange={() => setPlan("keep")} style={{ marginTop: 3 }} />
            {ask.info.needsYes ? (
              <span>
                Ask {nameOf(ask.next)} to make an exception for this time
                <span style={{ display: "block", color: "#8a5a00", fontSize: 13.5 }}>
                  {ask.info.busy ? `${nameOf(ask.next)} has another call then.` : `It's outside ${nameOf(ask.next)}'s open hours.`} {nameOf(ask.next)} can say yes, ask for a different time, or pass. Nothing moves until then.
                </span>
              </span>
            ) : (
              <span>
                Keep the same time, with {nameOf(ask.next)}
                <span className="muted" style={{ display: "block", fontSize: 13.5 }}>{nameOf(ask.next)} is open then.</span>
              </span>
            )}
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontWeight: 400, margin: 0 }}>
            <input type="radio" name={`plan-${p.candidateId}`} checked={plan === "rebook"} onChange={() => setPlan("rebook")} style={{ marginTop: 3 }} />
            <span>
              Let the candidate pick a new time with {nameOf(ask.next)}
              <span className="muted" style={{ display: "block", fontSize: 13.5 }}>This call is cancelled, and the candidate gets an email with a link to {nameOf(ask.next)}&rsquo;s open times.</span>
            </span>
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontWeight: 400, margin: 0 }}>
            <input type="radio" name={`plan-${p.candidateId}`} checked={plan === "stay"} onChange={() => setPlan("stay")} style={{ marginTop: 3 }} />
            <span>Leave this call with {ask.info.with}</span>
          </label>
          <span style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-small" onClick={() => save(ask.next, plan)}>
              Switch to {nameOf(ask.next)}
            </button>
            <button type="button" className="btn btn-small btn-ghost" onClick={() => setAsk(null)}>
              Cancel
            </button>
          </span>
        </span>
      )}
      {pending ? (
        <span className="small muted">{ask ? "Saving…" : "One moment…"}</span>
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
