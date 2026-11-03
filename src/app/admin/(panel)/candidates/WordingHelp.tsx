"use client";

import { useState, useTransition } from "react";
import { findBlanks } from "@/lib/tidyText";
import { suggestProfileWording } from "../../actions";
import styles from "./form.module.css";

type W = { headline: string; summary: string; highlights: string };

// Under the story fields: points out any "[blanks]" left in and offers to fix them,
// plus an optional "Polish wording". Suggestions only; the rep chooses.
export function WordingHelp({
  candidateId,
  role,
  value,
  onUse,
}: {
  candidateId: string | null;
  role: string;
  value: W;
  onUse: (w: W) => void;
}) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"" | "fix" | "polish">("");
  const [idea, setIdea] = useState<W | null>(null);
  const [error, setError] = useState("");
  const blanks = [...new Set([value.headline, value.summary, value.highlights].flatMap(findBlanks))];
  const empty = !value.headline.trim() && !value.summary.trim() && !value.highlights.trim();

  function ask(mode: "fix" | "polish") {
    setBusy(mode);
    setError("");
    setIdea(null);
    start(async () => {
      const r = await suggestProfileWording(candidateId, mode, { ...value, role });
      if (r.wording) setIdea(r.wording);
      else setError(r.error ?? "Something went wrong. Try again.");
      setBusy("");
    });
  }

  const changed = idea && (["headline", "summary", "highlights"] as const).filter((k) => idea[k].trim() !== value[k].trim());

  return (
    <div className={styles.wording}>
      {blanks.length > 0 && (
        <div className={styles.blankNote}>
          <span>
            Looks like a blank to fill in: <b>{blanks.join(", ")}</b>. Fill it in, or let us reword it.
          </span>
          <button type="button" className={styles.ideaMain} disabled={pending} onClick={() => ask("fix")}>
            {busy === "fix" ? "Working…" : "Fix it for me"}
          </button>
        </div>
      )}
      <div className={styles.ideas}>
        <button type="button" className={styles.idea} disabled={pending || empty} onClick={() => ask("polish")}>
          {busy === "polish" ? "Polishing…" : "✨ Polish wording"}
        </button>
        <span className={styles.wordingHint}>Spacing, capitals and periods are tidied for you when you save.</span>
      </div>
      {error && <p className="small error">{error}</p>}
      {idea && changed && (
        <div className={styles.suggestion}>
          {changed.length === 0 ? (
            <p className="small">Nothing to change. It already reads well.</p>
          ) : (
            <>
              <p className="small muted">Suggested wording. Nothing changes unless you choose it.</p>
              {changed.map((k) => (
                <div key={k} className={styles.suggestRow}>
                  <b>{k === "headline" ? "Headline" : k === "summary" ? "Summary" : "Highlights"}</b>
                  <p>{idea[k]}</p>
                </div>
              ))}
              <div className={styles.inlineBtns}>
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => {
                    onUse(idea);
                    setIdea(null);
                  }}
                >
                  Use this
                </button>
                <button type="button" className="btn btn-small btn-ghost" onClick={() => setIdea(null)}>
                  Keep mine
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
