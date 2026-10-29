"use client";

import { useActionState } from "react";
import { LinkState, requestCandidateLink } from "../actions";

export function LinkForm() {
  const [state, action, pending] = useActionState<LinkState, FormData>(requestCandidateLink, {});
  if (state.sent) {
    return (
      <div className="notice notice-good" role="status">
        <p style={{ margin: 0 }}>
          <strong>Check your email.</strong> If <strong>{state.sent}</strong> is the address you gave us, a link to your
          page is on its way.
        </p>
        <p style={{ margin: "8px 0 0" }} className="small">
          Nothing after a few minutes? Check your spam folder, or try the email you used when you signed up.
        </p>
      </div>
    );
  }
  return (
    <form action={action}>
      <label className="field">
        <span>The email you signed up with</span>
        <input className="input" type="email" name="email" required autoComplete="email" autoFocus />
      </label>
      {state.error && (
        <p className="notice notice-bad" role="alert" style={{ marginTop: 14 }}>
          {state.error}
        </p>
      )}
      <button className="btn btn-gold" type="submit" disabled={pending} style={{ marginTop: 18, width: "100%" }}>
        {pending ? "Sending…" : "Email me a link"}
      </button>
    </form>
  );
}
