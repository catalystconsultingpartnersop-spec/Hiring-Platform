"use client";

import { useActionState } from "react";
import { signRepAgreement, FormState } from "../actions";

export function SignRep({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signRepAgreement, {});
  return (
    <form action={action} style={{ marginTop: 22, background: "var(--marigold-soft)", borderRadius: 18, padding: "22px clamp(18px, 3vw, 26px)" }}>
      <h2 style={{ fontSize: 20, margin: 0 }}>Sign here</h2>
      <label className="field" style={{ marginTop: 12 }}>
        <span>Your full name (this is your signature)</span>
        <input className="input" name="signed_name" defaultValue={defaultName} required autoComplete="name" />
      </label>
      <label className="check" style={{ marginTop: 14 }}>
        <input type="checkbox" name="mission" required />
        <span>I&rsquo;m here because I care about candidates and want to help them.</span>
      </label>
      <label className="check" style={{ marginTop: 10 }}>
        <input type="checkbox" name="agree" required />
        <span>I agree to the rep agreement above.</span>
      </label>
      {state.error && (
        <p className="notice notice-bad" role="alert" style={{ marginTop: 14 }}>
          {state.error}
        </p>
      )}
      <button className="btn" type="submit" disabled={pending} style={{ marginTop: 18, width: "100%", minHeight: 52 }}>
        {pending ? "One moment…" : "Sign and get started"}
      </button>
    </form>
  );
}
