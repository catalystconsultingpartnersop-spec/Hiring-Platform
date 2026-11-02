"use client";

import { useActionState, useState } from "react";
import { FormState, welcomeStaff } from "../actions";

export function WelcomeForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(welcomeStaff.bind(null, token), {});
  const [show, setShow] = useState(false);
  return (
    <form action={action}>
      <input type="email" name="email" value={email} autoComplete="username" readOnly hidden />
      <label className="field">
        <span>Choose a password (at least 8 characters)</span>
        <input className="input" type={show ? "text" : "password"} name="password" required minLength={8} autoComplete="new-password" autoFocus />
      </label>
      <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 14, marginTop: -6 }}>
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} style={{ width: 16, height: 16, margin: 0 }} /> Show it
      </label>
      {state.error && (
        <p className="notice notice-bad" role="alert" style={{ marginTop: 16 }}>
          {state.error}
        </p>
      )}
      <button className="btn btn-gold" type="submit" disabled={pending} style={{ marginTop: 20, width: "100%" }}>
        {pending ? "Signing you in…" : "Get started"}
      </button>
      <p className="small muted" style={{ marginTop: 12 }}>
        From now on, sign in with {email} and this password. You stay signed in on this device for 30 days.
      </p>
    </form>
  );
}
