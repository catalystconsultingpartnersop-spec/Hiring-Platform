"use client";

import { useActionState } from "react";
import { adminLogin, FormState } from "../actions";

export default function AdminLogin() {
  const [state, action, pending] = useActionState<FormState, FormData>(adminLogin, {});
  return (
    <div className="wrap narrow" style={{ maxWidth: 420 }}>
      <div className="page-head">
        <h1>Admin</h1>
      </div>
      <form action={action}>
        <label className="field">
          <span>Password</span>
          <input className="input" type="password" name="password" required autoComplete="current-password" autoFocus />
        </label>
        {state.error && (
          <p className="notice notice-bad" role="alert" style={{ marginTop: 16 }}>
            {state.error}
          </p>
        )}
        <button className="btn" type="submit" disabled={pending} style={{ marginTop: 20 }}>
          {pending ? "Checking…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
