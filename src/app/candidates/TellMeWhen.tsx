"use client";

import { useActionState, useState } from "react";
import { tellMeWhen, type TellState } from "./tellMeWhen";
import styles from "./catalog.module.css";

// One quiet line under the candidates. The two boxes appear only when it's tapped.
export function TellMeWhen({ roles, words }: { roles: string[]; words: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<TellState, FormData>(tellMeWhen, {});
  return (
    <div className={styles.tell}>
      {state.ok ? (
        <p role="status">
          <strong>You&rsquo;re set.</strong> We&rsquo;ll text you when they join.
        </p>
      ) : (
        <>
          <p>
            Don&rsquo;t see who you need?{" "}
            <button type="button" className={styles.tellLink} aria-expanded={open} onClick={() => setOpen(!open)}>
              Tell us the role and we&rsquo;ll text you when they join.
            </button>
          </p>
          {open && (
            <form action={action} className={styles.tellForm}>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999 }} />
              <input className="input" name="role" list="tell-roles" placeholder="Role, e.g. Controller" aria-label="Role" required maxLength={60} autoFocus />
              <datalist id="tell-roles">
                {roles.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
              <input className="input" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="Your cell number" aria-label="Your cell number" required />
              <button className="btn btn-small" disabled={pending}>
                {pending ? "Saving…" : "Text me"}
              </button>
              {state.error && (
                <p className={styles.tellErr} role="alert">
                  {state.error}
                </p>
              )}
              <p className={styles.tellFine}>{words}</p>
            </form>
          )}
        </>
      )}
    </div>
  );
}
