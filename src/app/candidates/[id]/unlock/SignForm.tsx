"use client";

import { useActionState } from "react";
import { signAgreement, SignState } from "../actions";

export function SignForm({ candidateId, defaultName }: { candidateId: string; defaultName: string }) {
  const [state, action, pending] = useActionState<SignState, FormData>(signAgreement.bind(null, candidateId), {});
  return (
    <form action={action} style={{ marginTop: 24 }}>
      <label className="field">
        <span>Type your full name to sign</span>
        <input className="input" name="signed_name" defaultValue={defaultName} required autoComplete="name" />
      </label>
      <label className="check" style={{ marginTop: 16 }}>
        <input type="checkbox" name="agree" required />
        <span>I&rsquo;ve read the agreement and I agree to it on behalf of my company.</span>
      </label>
      {state.error && (
        <p className="notice notice-bad" role="alert" style={{ marginTop: 16 }}>
          {state.error}
        </p>
      )}
      <button className="btn btn-gold" type="submit" disabled={pending} style={{ marginTop: 20 }}>
        {pending ? "Signing…" : "Sign and see who this is"}
      </button>
    </form>
  );
}
