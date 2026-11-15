"use client";

import { useState, useTransition } from "react";
import { setCandidatesSeeBusiness } from "../../actions";

export function CandidateSide({ on }: { on: boolean }) {
  const [value, setValue] = useState(on);
  const [pending, start] = useTransition();
  const flip = () =>
    start(async () => {
      await setCandidatesSeeBusiness(!value);
      setValue(!value);
    });
  return (
    <section className="panel" style={{ margin: "8px 0 28px", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
      <div style={{ minWidth: 0, flex: "1 1 320px" }}>
        <strong>{value ? "Candidates can browse the whole site." : "Candidates see only the candidate side."}</strong>
        <p className="small muted" style={{ margin: "4px 0 0" }}>
          {value
            ? "People who come in through a candidate link or the flyer can see Browse candidates and the business pages."
            : "People who come in through a candidate link or the flyer don't see Browse candidates or the business pages. Turn it back on once the catalog is full."}
        </p>
      </div>
      <button className={value ? "btn btn-ghost btn-small" : "btn btn-gold btn-small"} type="button" disabled={pending} onClick={flip}>
        {pending ? "Saving…" : value ? "Hide the business side from candidates" : "Show the business side to candidates"}
      </button>
    </section>
  );
}
