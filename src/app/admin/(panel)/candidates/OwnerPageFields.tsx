"use client";

import { useState, useTransition } from "react";
import { handleToText, parseOwnerPage } from "@/lib/ownerPageShared";
import { draftOwnerPageAction } from "../../actions";
import styles from "./form.module.css";

// What business owners read on the candidate's page: an introduction, what they'd
// handle, and who they're a strong fit for. "Write it for me" drafts it from their
// resume, call and strengths; nothing is saved until the rep presses Save.
export function OwnerPageFields({
  candidateId,
  raw,
  headline,
  onHeadline,
}: {
  candidateId: string | null;
  raw: string | undefined;
  headline: string;
  onHeadline: (h: string) => void;
}) {
  const start = parseOwnerPage(raw);
  const [intro, setIntro] = useState(start?.intro ?? "");
  const [handle, setHandle] = useState(start ? handleToText(start.handle) : "");
  const [fit, setFit] = useState(start?.fit.join("\n") ?? "");
  const [years, setYears] = useState(start?.years ?? "");
  const [newHeadline, setNewHeadline] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [pending, run] = useTransition();
  const hasAny = !!(intro.trim() || handle.trim() || fit.trim());

  function write() {
    if (!candidateId) return;
    if (hasAny && !window.confirm("Replace what's here with a new draft? Nothing is saved until you press Save.")) return;
    setError("");
    setNote("");
    run(async () => {
      const r = await draftOwnerPageAction(candidateId);
      if (r.error) {
        setError(r.error);
        return;
      }
      setIntro(r.intro ?? "");
      setHandle(r.handle ?? "");
      setFit(r.fit ?? "");
      setYears(r.years ?? "");
      setNewHeadline(r.headline && r.headline !== headline ? r.headline : "");
      setNote("Here's a draft. Read it through, change anything, then press Save.");
    });
  }

  return (
    <div className={styles.ownerPage}>
      <h3>Their page for owners</h3>
      <p className="small muted">
        What a business owner reads when they open this profile. Written to the owner: who this person is right for and what
        they&rsquo;d handle. Leave it empty and we&rsquo;ll write it when they&rsquo;re listed.
      </p>
      <div className={styles.ideas}>
        <button type="button" className={styles.ideaMain} disabled={!candidateId || pending} onClick={write}>
          {pending ? "Writing… (about 20 seconds)" : hasAny ? "Write a fresh draft" : "Write it for me"}
        </button>
        {!candidateId && <span className={styles.wordingHint}>Save them first, then we can write it from their resume.</span>}
      </div>
      {error && <p className="small error">{error}</p>}
      {note && <p className="small" style={{ color: "var(--moss)" }}>{note}</p>}
      {newHeadline && (
        <div className={styles.blankNote}>
          <span>
            Suggested headline: <b>{newHeadline}</b>
          </span>
          <button
            type="button"
            className={styles.ideaMain}
            onClick={() => {
              onHeadline(newHeadline);
              setNewHeadline("");
            }}
          >
            Use it
          </button>
        </div>
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
    </div>
  );
}
