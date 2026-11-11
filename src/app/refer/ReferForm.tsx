"use client";

import { useActionState } from "react";
import { signUpReferrer, type ReferState } from "./actions";

export function ReferForm() {
  const [state, action, pending] = useActionState<ReferState, FormData>(signUpReferrer, {});
  const v = (k: string) => state.fields?.[k] ?? "";
  if (state.resent)
    return (
      <div className="notice notice-good" role="status">
        <strong>You&rsquo;re already signed up.</strong> We just emailed your link and your page to {state.resent}.
      </div>
    );
  return (
    <form action={action} className="panel" style={{ display: "grid", gap: 10 }}>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
      <div className="grid-2">
        <label className="field">
          <span>Your name</span>
          <input className="input" name="name" required defaultValue={v("name")} autoComplete="name" />
        </label>
        <label className="field">
          <span>Email</span>
          <input className="input" name="email" type="email" required defaultValue={v("email")} autoComplete="email" />
        </label>
        <label className="field">
          <span>Phone (optional)</span>
          <input className="input" name="phone" type="tel" defaultValue={v("phone")} autoComplete="tel" />
        </label>
        <label className="field">
          <span>How should we pay you? (optional)</span>
          <input className="input" name="pay" defaultValue={v("pay")} placeholder="e.g. Zelle to my phone number" />
        </label>
      </div>
      <label className="small" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <input type="checkbox" name="agree" required style={{ marginTop: 3 }} /> I&rsquo;ve read how it works above.
      </label>
      {state.error && <p className="notice notice-bad small">{state.error}</p>}
      <button className="btn btn-gold" type="submit" disabled={pending} style={{ justifySelf: "start" }}>
        {pending ? "One moment…" : "Get my link"}
      </button>
    </form>
  );
}
