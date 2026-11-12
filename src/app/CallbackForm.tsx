"use client";

import { useActionState } from "react";
import { requestCallback, type CallbackState } from "./callback";
import s from "./home.module.css";

export function CallbackForm() {
  const [state, action, pending] = useActionState<CallbackState, FormData>(requestCallback, {});
  if (state.ok)
    return (
      <div className={s.cbDone}>
        <span aria-hidden>✓</span>
        <b>Got it. We&rsquo;ll call you.</b>
        <p>At {state.phone}. We&rsquo;re already looking at who fits.</p>
      </div>
    );
  return (
    <form action={action} className={s.cbForm}>
      <label>
        <span>The position</span>
        <input className="input" name="role" placeholder="e.g. Office manager, bookkeeper, sales" required />
      </label>
      <div className={s.cbTwo}>
        <label>
          <span>Your name</span>
          <input className="input" name="name" autoComplete="name" required />
        </label>
        <label>
          <span>Phone</span>
          <input className="input" name="phone" type="tel" autoComplete="tel" required />
        </label>
      </div>
      {state.error && <p className={s.cbErr}>{state.error}</p>}
      <button className={`btn btn-gold ${s.cbBtn}`} disabled={pending}>
        {pending ? "Sending…" : "Call me back"}
      </button>
    </form>
  );
}
