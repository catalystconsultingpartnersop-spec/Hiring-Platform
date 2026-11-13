"use client";

import { useOptimistic, useTransition } from "react";
import { setBookMe } from "@/app/admin/actions";
import s from "./hours.module.css";

// Who can book you. The same hours below, switched on or off for each group.
export function BookSwitches({ candidates, owners, showOwners, hasHours }: { candidates: boolean; owners: boolean; showOwners: boolean; hasHours: boolean }) {
  const [state, setState] = useOptimistic({ candidates, owners });
  const [, start] = useTransition();
  const flip = (kind: "candidates" | "owners") =>
    start(async () => {
      const on = !state[kind];
      setState({ ...state, [kind]: on });
      await setBookMe(kind, on);
    });
  const row = (kind: "candidates" | "owners", title: string, onText: string, offText: string) => (
    <label className={s.switchRow}>
      <input type="checkbox" role="switch" checked={state[kind]} onChange={() => flip(kind)} />
      <span>
        <b>{title}</b>
        <small>{state[kind] ? onText : offText}</small>
      </span>
    </label>
  );
  return (
    <section className={s.switches}>
      <h2>Who can book me</h2>
      {row("candidates", "Candidates can book me", "On. Candidates see your open times for onboarding calls.", "Off. Candidates don't see your times.")}
      {showOwners && row("owners", "Business owners can book me", "On. Owners see your open times for a video call.", "Off. Owners don't see your times.")}
      {!hasHours && (state.candidates || (showOwners && state.owners)) && <p className={s.switchNote}>You have no hours set yet, so nobody can book you until you add some below.</p>}
    </section>
  );
}
