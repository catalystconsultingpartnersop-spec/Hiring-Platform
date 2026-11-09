"use client";

import { useActionState, useEffect, useRef } from "react";
import { answerOwner } from "../actions";

export function RepAnswer({ threadId }: { threadId: string }) {
  const [state, action, pending] = useActionState(answerOwner.bind(null, threadId), null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="talk-reply">
      <textarea className="textarea" name="text" rows={4} required placeholder="Write your answer. The owner gets it by email." />
      {state && !state.ok && (
        <p className="notice notice-bad" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="notice notice-good" role="status">
          Sent. The owner got an email.
        </p>
      )}
      <button className="btn btn-gold" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send answer"}
      </button>
    </form>
  );
}
