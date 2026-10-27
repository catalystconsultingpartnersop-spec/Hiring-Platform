"use client";

import { useActionState } from "react";
import type { Owner } from "@/lib/db";
import { saveSetup, SetupState } from "../actions";

export function SetupForm({ next, owner }: { next: string; owner: Owner }) {
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
