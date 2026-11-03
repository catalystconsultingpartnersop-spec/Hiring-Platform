"use client";

import { useState } from "react";
import { handleToText, parseOwnerPage } from "@/lib/ownerPageShared";
import styles from "./form.module.css";

// What business owners read on the candidate's page. The system writes it by itself
// (when they're listed, and again when their details change). Reps can edit it if they
// want to; clearing it hands it back to the system.
export function OwnerPageFields({ raw, listed }: { raw: string | undefined; listed: boolean }) {
  const start = parseOwnerPage(raw);
  const [intro, setIntro] = useState(start?.intro ?? "");
  const [handle, setHandle] = useState(start ? handleToText(start.handle) : "");
  const [fit, setFit] = useState(start?.fit.join("\n") ?? "");
  const [years, setYears] = useState(start?.years ?? "");
  const [backToAuto, setBackToAuto] = useState(false);
  // What the form showed when it opened, so saving without touching it changes nothing.
  const [was] = useState(() =>
    [start?.intro ?? "", start ? handleToText(start.handle) : "", start?.fit.join("\n") ?? "", start?.years ?? ""].map((x) => x.trim().replace(/\s+/g, " ")).join("|"),
  );

  const status = backToAuto
    ? "We'll write it again automatically when you save."
    : !start
      ? listed
        ? "We're writing it automatically. It will be ready in about a minute."
        : "We'll write it automatically when you list them."
      : start.auto
        ? "Written automatically from their resume, call and strengths. It updates by itself when their details change."
        : "Edited by your team, so we won't rewrite it automatically.";

  return (
    <div className={styles.ownerPage}>
      <h3>Their page for owners</h3>
      <p className={styles.ownerStatus}>
        <span aria-hidden="true">{start && !start.auto && !backToAuto ? "✎" : "✓"}</span> {status}
      </p>
      <input type="hidden" name="owner_was" value={was} />
      <details className={styles.more} open={!!start && !start.auto}>
        <summary>{start ? "Edit it yourself" : "Write it yourself instead"}</summary>
        {start && !start.auto && !backToAuto && (
          <button
            type="button"
            className={styles.idea}
            style={{ marginTop: 10 }}
            onClick={() => {
              setIntro("");
              setHandle("");
              setFit("");
              setYears("");
              setBackToAuto(true);
            }}
          >
            Go back to automatic
          </button>
        )}
        <label className="field">
          <span>Introduction</span>
          <textarea
            className="textarea"
            name="owner_intro"
            rows={4}
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            placeholder="If you're looking for someone who can…, this candidate is worth a conversation. They bring…"
          />
        </label>
        <label className="field">
          <span>What they&rsquo;d handle for you (one per line, &ldquo;Title: what it means&rdquo;)</span>
          <textarea
            className="textarea"
            name="owner_handle"
            rows={6}
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder={"📞 Keep your customers happy: Returns calls the same day and follows up until it's solved."}
          />
        </label>
        <label className="field">
          <span>A strong fit if you… (one per line)</span>
          <textarea
            className="textarea"
            name="owner_fit"
            rows={3}
            value={fit}
            onChange={(e) => setFit(e.target.value)}
            placeholder={"Need someone who can run the front office\nWant one person to own a project from start to finish"}
          />
        </label>
        <label className="field" style={{ maxWidth: 260 }}>
          <span>Years of experience (optional)</span>
          <input className="input" name="owner_years" value={years} onChange={(e) => setYears(e.target.value)} placeholder="e.g. 7+ years" />
        </label>
        <p className="small muted">Clear all of it and save to have it written automatically again.</p>
      </details>
    </div>
  );
}
