"use client";

import { useActionState } from "react";
import { FormState, setMyPassword } from "../../actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(setMyPassword, {});
  return (
    <form action={action}>
      <label className="field">
        <span>New password (at least 8 characters)</span>
        <input className="input" type="password" name="password" required minLength={8} autoComplete="new-password" />
      </label>
      <label className="field">
        <span>Type it again</span>
        <input className="input" type="password" name="password2" required minLength={8} autoComplete="new-password" />
      </label>
      {state.error && (
        <p className="notice notice-bad" role="alert" style={{ marginTop: 16 }}>
          {state.error}
        </p>
      )}
      <button className="btn btn-gold" type="submit" disabled={pending} style={{ marginTop: 20 }}>
        {pending ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
