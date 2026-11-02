"use client";

import { useState, useTransition } from "react";
import { draftProfileFromCall } from "../../actions";

// "From the call": turns the recorded call into a first draft of the profile.
export function CallDraftPanel({ candidateId, madeAt, notes }: { candidateId: string; madeAt: string | null; notes: string | null }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      setError("");
      const r = await draftProfileFromCall(candidateId);
      if (r.error) setError(r.error);
      else window.location.reload();
    });
  return (
    <section className="panel" style={{ marginTop: 16, borderColor: "var(--marigold)" }}>
      <h2 style={{ fontSize: 18, margin: 0 }}>From the call</h2>
      {madeAt ? (
        <>
          <p className="small muted" style={{ margin: "4px 0 10px" }}>
            Drafted from the recorded call on {new Date(madeAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}. Anything you
            hadn&rsquo;t written yet (headline, summary, highlights, full profile) was filled in below. Read it, make it yours, then list them.
          </p>
          {notes && (
            <details>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>Private notes from the call</summary>
              <pre style={{ whiteSpace: "pre-wrap", font: "inherit", fontSize: 14.5, margin: "8px 0 0" }}>{notes}</pre>
            </details>
          )}
        </>
      ) : (
        <p className="small muted" style={{ margin: "4px 0 10px" }}>
          Their call was recorded. One click turns it into a first draft of their profile, plus private notes for the team.
        </p>
      )}
      <button className={madeAt ? "btn btn-ghost btn-small" : "btn btn-gold btn-small"} type="button" disabled={pending} onClick={run} style={{ marginTop: 10 }}>
        {pending ? "Reading the call… (about 30 seconds)" : madeAt ? "Draft it again" : "Draft the profile from the call"}
      </button>
      {error && (
        <p className="notice notice-bad" role="alert" style={{ marginTop: 10 }}>
          {error}
        </p>
      )}
    </section>
  );
}
