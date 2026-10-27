"use client";

import { useActionState, useState } from "react";
import { signAgreement, SignState } from "../actions";

export function SignForm({
  candidateId,
  defaultName,
  savedCard,
}: {
  candidateId: string;
  defaultName: string;
  savedCard: string | null;
}) {
  const [state, action, pending] = useActionState<SignState, FormData>(signAgreement.bind(null, candidateId), {});
  const [newCard, setNewCard] = useState(false);
  const useSaved = !!savedCard && !newCard;
  return (
    <form action={action} style={{ marginTop: 24 }}>
      <label className="field">
        <span>Type your full name to sign</span>
        <input className="input" name="signed_name" defaultValue={defaultName} required autoComplete="name" />
      </label>
      <label className="check" style={{ marginTop: 16 }}>
        <input type="checkbox" name="agree" required />
        <span>
          I&rsquo;ve read the agreement and I agree to it on behalf of my company, including keeping a card on file
          that the fee is charged to if we hire.
        </span>
      </label>
      {savedCard && (
        <div className="panel panel-wash" style={{ marginTop: 16, padding: "12px 16px" }}>
          {useSaved ? (
            <span className="small">
              Card on file: <strong>{savedCard}</strong>.{" "}
              <button type="button" className="linkish" style={{ marginTop: 0 }} onClick={() => setNewCard(true)}>
                Use a different card
              </button>
            </span>
          ) : (
            <span className="small">You&rsquo;ll add a new card on the next screen.</span>
          )}
        </div>
      )}
      {newCard && <input type="hidden" name="new_card" value="1" />}
      {state.error && (
        <p className="notice notice-bad" role="alert" style={{ marginTop: 16 }}>
          {state.error}
        </p>
      )}
      <button className="btn btn-gold" type="submit" disabled={pending} style={{ marginTop: 20 }}>
        {pending ? "Signing…" : useSaved ? "Sign and see who this is" : "Sign and add a card"}
      </button>
      <p className="small muted" style={{ marginTop: 10 }}>
        {useSaved
          ? "Nothing is charged now."
          : "Next, you'll add a card on our secure payment page (Stripe). Nothing is charged now."}
      </p>
    </form>
  );
}
