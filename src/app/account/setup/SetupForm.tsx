"use client";

import { useActionState } from "react";
import { saveSetup, SetupState } from "../actions";

type Basics = { full_name: string | null; company: string | null; phone: string | null; email: string };

export function SetupForm({
  next,
  owner,
  needsPassword,
  resetting,
}: {
  next: string;
  owner: Basics;
  needsPassword: boolean;
  resetting: boolean;
}) {
  const [state, action, pending] = useActionState<SetupState, FormData>(saveSetup, {});
  return (
    <form action={action}>
      <input type="hidden" name="next" value={next} />
      <label className="field">
        <span>Your full name</span>
        <input className="input" name="full_name" defaultValue={owner.full_name ?? ""} required autoComplete="name" />
      </label>
      <label className="field">
        <span>Company</span>
        <input className="input" name="company" defaultValue={owner.company ?? ""} required autoComplete="organization" />
      </label>
      <label className="field">
        <span>Phone (optional)</span>
        <input className="input" name="phone" type="tel" defaultValue={owner.phone ?? ""} autoComplete="tel" />
      </label>
      <input type="email" name="email" value={owner.email} autoComplete="username" readOnly hidden />
      <label className="field">
        <span>
          {needsPassword || resetting ? "Choose a password (at least 8 characters)" : "Password (optional, at least 8 characters)"}
        </span>
        <input
          className="input"
          type="password"
          name="password"
          required={needsPassword || resetting}
          minLength={8}
          autoComplete="new-password"
          autoFocus={resetting}
        />
      </label>
      {state.error && (
        <p className="notice notice-bad" role="alert" style={{ marginTop: 16 }}>
          {state.error}
        </p>
      )}
      <button className="btn" type="submit" disabled={pending} style={{ marginTop: 20 }}>
        {pending ? "Saving…" : "Save and continue"}
      </button>
    </form>
  );
}
