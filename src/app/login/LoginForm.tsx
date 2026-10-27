"use client";

import { useActionState } from "react";
import { LoginState, requestLink } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(requestLink, {});
  if (state.sent) {
    return (
      <p className="notice notice-good" role="status">
        Check your inbox. We sent a sign-in link to <strong>{state.sent}</strong>. It works for 30 minutes.
      </p>
    );
  }
  return (
    <form action={action}>
      <input type="hidden" name="next" value={next} />
      <label className="field">
        <span>Work email</span>
        <input className="input" type="email" name="email" required autoComplete="email" />
      </label>
      {state.error && (
        <p className="notice notice-bad" role="alert" style={{ marginTop: 16 }}>
          {state.error}
        </p>
      )}
      <button className="btn" type="submit" disabled={pending} style={{ marginTop: 20 }}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
