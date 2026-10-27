"use client";

import { useActionState } from "react";
import { FormState, sendTestEmail } from "../actions";

export function EmailCheck({ problem, settings }: { problem: string | null; settings: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendTestEmail, {});
  if (!problem && !state.error && !state.ok) {
    return (
      <form action={action} style={{ marginTop: 10 }}>
        <button className="btn btn-ghost btn-small" type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send a test email"}
        </button>
      </form>
    );
  }
  return (
    <div className={`notice ${state.ok ? "notice-good" : "notice-bad"}`} role="status" style={{ marginTop: 20 }}>
      {state.ok ? (
        <p>{state.ok}</p>
      ) : (
        <>
          <p>
            <strong>Emails aren&rsquo;t going out.</strong> {state.error ?? `Last error: ${problem}`}
          </p>
          <p className="small" style={{ marginTop: 6 }}>
            Settings the site sees: {settings}
          </p>
        </>
      )}
      <form action={action} style={{ marginTop: 10 }}>
        <button className="btn btn-small" type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send a test email"}
        </button>
      </form>
    </div>
  );
}
