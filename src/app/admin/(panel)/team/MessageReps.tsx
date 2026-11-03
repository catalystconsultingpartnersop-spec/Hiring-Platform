"use client";

import { useActionState } from "react";
import { FormState, messageAllReps } from "../../actions";

const SUBJECT = "New: our own Strengths Assessment";
const BODY = `Big update: we no longer use Working Genius. We have our own Strengths Assessment, built for our candidates. It's free and takes about 8 minutes.

What changes for you:

1. You don't ask candidates to buy anything or send you results. Their booking email links to our assessment, and the day-before reminder does too.

2. When they finish, their result lands on their profile by itself, and you get an email. On their profile it shows as six strengths: two natural strengths, two they can do well, and two that wear them down. You can still change the order if the call tells you otherwise.

3. The six, in our words: Big-picture thinking, Fresh ideas, Sound judgment, Getting people moving, Supporting the team, Finishing the job.

4. Want someone to take it? On your dashboard, the Strengths Assessment box has Send on WhatsApp and Copy link. Or open their profile and use Send a reminder.

5. Please don't mention Working Genius to candidates or businesses anymore. It's our Strengths Assessment now.

Take it yourself first (it's on your dashboard). It makes the conversation with candidates much easier.

Thank you for what you do for our candidates.`;

export function MessageReps() {
  const [state, action, pending] = useActionState<FormState, FormData>(messageAllReps, {});
  return (
    <details className="panel" style={{ marginTop: 24 }}>
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>Message all reps</summary>
      <form
        action={action}
        style={{ display: "grid", gap: 12, marginTop: 14 }}
        onSubmit={(e) => {
          if (!window.confirm("Send this email to every active rep?")) e.preventDefault();
        }}
      >
        <p className="small muted" style={{ margin: 0 }}>
          One email to every active rep, with a button to the rep guide. It&rsquo;s filled in with today&rsquo;s updates; change
          anything you like.
        </p>
        <label className="field">
          <span>Subject</span>
          <input className="input" name="subject" defaultValue={SUBJECT} />
        </label>
        <label className="field">
          <span>Message</span>
          <textarea className="textarea" name="body" rows={14} defaultValue={BODY} />
        </label>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-gold btn-small" type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send to all reps"}
          </button>
          {state.ok && !pending && <span className="small" style={{ color: "var(--moss)" }}>{state.ok}</span>}
          {state.error && !pending && <span className="small" style={{ color: "var(--rust)" }}>{state.error}</span>}
        </div>
      </form>
    </details>
  );
}
