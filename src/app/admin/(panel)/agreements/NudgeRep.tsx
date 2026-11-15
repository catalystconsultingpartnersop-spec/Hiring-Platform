"use client";

import { useActionState, useState } from "react";
import { nudgeRep, type RepNudgeState } from "./actions";
import s from "./intro.module.css";

// Opens a small box: add a line if you like, then send. The rep gets an email, and a text if they have texts on.
export function NudgeRep({ unlockId, rep }: { unlockId: string; rep: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<RepNudgeState, FormData>(nudgeRep, {});
  if (state.ok) return <span className={s.done}>Nudge sent to {rep} ✓</span>;
  if (!open)
    return (
      <button type="button" className="btn btn-small btn-ghost" onClick={() => setOpen(true)}>
        Nudge {rep}
      </button>
    );
  return (
    <form action={action} className={s.repForm}>
      <input type="hidden" name="unlock_id" value={unlockId} />
      <label className="small muted" htmlFor={`n${unlockId}`}>
        {rep} gets a short note asking to check in. Add a line if you like.
      </label>
      <input id={`n${unlockId}`} className="input" name="note" placeholder="Optional" maxLength={600} />
      {state.error && <p className={s.err}>{state.error}</p>}
      <div className={s.row}>
        <button className="btn btn-small" disabled={pending}>
          {pending ? "Sending…" : `Send to ${rep}`}
        </button>
        <button type="button" className="btn btn-small btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
