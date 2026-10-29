"use client";

import { useActionState, useState } from "react";
import { signAgreement, SignState } from "../actions";

export function SignForm({
  candidateId,
  defaultName,
  company,
  savedCard,
  fee,
}: {
  candidateId: string;
  defaultName: string;
  company: string;
  savedCard: string | null;
  fee: string | null;
}) {
  const [state, action, pending] = useActionState<SignState, FormData>(signAgreement.bind(null, candidateId), {});
  const [newCard, setNewCard] = useState(false);
  const useSaved = !!savedCard && !newCard;
  return (
    <form
      action={action}
      style={{ marginTop: 22, background: "var(--marigold-soft)", borderRadius: 18, padding: "22px clamp(18px, 3vw, 26px)" }}
    >
      <h2 style={{ fontSize: 20, margin: 0 }}>Sign here</h2>
      <label className="field" style={{ marginTop: 12 }}>
        <span>Your full name (this is your signature)</span>
        <input className="input" name="signed_name" defaultValue={defaultName} required autoComplete="name" />
      </label>
      <label className="check" style={{ marginTop: 14 }}>
        <input type="checkbox" name="agree" required />
        <span>
          I agree to the agreement on behalf of {company || "my company"}
          {fee ? `, including the ${fee} fee if we hire this person` : ""}.
        </span>
      </label>
      {savedCard && (
        <p className="small" style={{ margin: "14px 0 0" }}>
          {useSaved ? (
            <>
              Using your <strong>{savedCard}</strong>.{" "}
              <button type="button" className="linkish" style={{ marginTop: 0 }} onClick={() => setNewCard(true)}>
                Use a different card
              </button>
            </>
          ) : (
            "You'll add a new card on the next screen."
          )}
        </p>
      )}
      {newCard && <input type="hidden" name="new_card" value="1" />}
      {state.error && (
        <p className="notice notice-bad" role="alert" style={{ marginTop: 14 }}>
          {state.error}
        </p>
      )}
      <button className="btn" type="submit" disabled={pending} style={{ marginTop: 18, width: "100%", minHeight: 52, fontSize: 16.5 }}>
        {pending ? "One moment…" : useSaved ? "Sign and meet them" : "Sign and add a card"}
      </button>
      <p className="small" style={{ margin: "10px 0 0", textAlign: "center", color: "var(--ink-2)" }}>
        {useSaved ? "Nothing is charged today." : "Nothing is charged today. The card form is secure, by Stripe."}
      </p>
    </form>
  );
}
