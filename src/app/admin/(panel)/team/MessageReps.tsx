"use client";

import { useActionState } from "react";
import { FormState, messageAllReps } from "../../actions";

const SUBJECT = "What's new for reps";
const BODY = `A few updates to make your work easier:

1. Your job, in one line: help each candidate discover what they're naturally great at, and the kind of role they belong in.

2. Working Genius before every call. As soon as a candidate books, ask them to take the 6 Working Genius assessment at workinggenius.com (they buy it themselves) and send you their results. Their booking email now asks them too, and their replies come straight to you. On the call, walk through their two geniuses and their frustrations, then talk about roles where they'd shine.

3. Share kit, in your menu. Two ready-made pictures with short messages: one to find candidates in your network, one for business owners. On your phone, tap Share and pick the person. Your links carry your name, so anyone who signs up through them is credited to you.

4. The rep guide now has a quick tour of your dashboard. Worth two minutes.

Thank you for what you do for our candidates.`;

export function MessageReps() {
  const [state, action, pending] = useActionState<FormState, FormData>(messageAllReps, {});
  return (
    <details className="panel" style={{ marginTop: 24 }}>
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>Message all reps</summary>
      <form
        action={action}
        style={{ display: "grid", gap: 12, marginTop: 14 }}
        onSubmit={(e) => {
          if (!window.confirm("Send this email to every active rep?")) e.preventDefault();
        }}
      >
        <p className="small muted" style={{ margin: 0 }}>
          One email to every active rep, with a button to the rep guide. It&rsquo;s filled in with today&rsquo;s updates; change
          anything you like.
        </p>
        <label className="field">
          <span>Subject</span>
          <input className="input" name="subject" defaultValue={SUBJECT} />
        </label>
        <label className="field">
          <span>Message</span>
          <textarea className="textarea" name="body" rows={14} defaultValue={BODY} />
        </label>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-gold btn-small" type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send to all reps"}
          </button>
          {state.ok && !pending && <span className="small" style={{ color: "var(--moss)" }}>{state.ok}</span>}
          {state.error && !pending && <span className="small" style={{ color: "var(--rust)" }}>{state.error}</span>}
        </div>
      </form>
    </details>
  );
}
