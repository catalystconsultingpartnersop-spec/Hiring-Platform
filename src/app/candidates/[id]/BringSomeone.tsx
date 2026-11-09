"use client";

import { useActionState, useState } from "react";
import { inviteGuest } from "./pathActions";
import styles from "./path.module.css";

// "Bring someone along": a partner or manager gets the time, the calendar invite,
// the resume and the one-page summary by email.
export function BringSomeone({ candidateId, meetingId, guests, what }: { candidateId: string; meetingId: string; guests: { name: string; email: string }[]; what: string }) {
  const [open, setOpen] = useState(false);
  const [state, act, pending] = useActionState(inviteGuest.bind(null, candidateId, meetingId), {} as { ok?: string; error?: string });
  return (
    <div className={styles.guests}>
      {guests.length > 0 && (
        <p className="small" style={{ margin: "0 0 6px" }}>
          <strong>Also invited:</strong> {guests.map((g) => g.name).join(", ")}
        </p>
      )}
      {!open ? (
        <button type="button" className={styles.skipBtn} onClick={() => setOpen(true)}>
          + Bring someone along to the {what}
        </button>
      ) : (
        <form action={act} className={styles.guestForm}>
          <p className="small muted" style={{ margin: 0 }}>
            They&rsquo;ll get the time, a calendar invite, the resume and a one-page summary.
          </p>
          <div className={styles.guestRow}>
            <input className="input" name="name" placeholder="Their name" autoComplete="off" required />
            <input className="input" name="email" type="email" placeholder="Their email" autoComplete="off" required />
            <button className="btn btn-small" type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send the invite"}
            </button>
          </div>
          {state.error && <p className="notice notice-bad">{state.error}</p>}
          {state.ok && <p className="notice notice-good">{state.ok} Want to add someone else? Just fill it in again.</p>}
        </form>
      )}
    </div>
  );
}
