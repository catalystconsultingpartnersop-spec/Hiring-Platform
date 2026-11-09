"use client";

import { useState, useTransition } from "react";
import { makeCleanResumeAction, saveCleanResumeAction, setOwnerResumeAction } from "../../actions";

type Clean = { text: string; at: string; by: string; sources: string; notes: string } | null;

const day = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" }) : "");

// Their resume as they sent it, and the clean version we made from it (and their call).
// The original is never changed.
export function ResumePanel({
  candidateId,
  hasResume,
  replaced,
  originalAt,
  clean,
  ownerSees,
  noResume,
}: {
  candidateId: string;
  hasResume: boolean;
  replaced: boolean;
  originalAt: string | null;
  clean: Clean;
  ownerSees: "clean" | "original";
  noResume: boolean;
}) {
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(clean?.text ?? "");
  const [pending, start] = useTransition();
  const [what, setWhat] = useState<"make" | "save" | "owner" | "">("");
  const pick = (which: "clean" | "original") =>
    start(async () => {
      setError("");
      setWhat("owner");
      const r = await setOwnerResumeAction(candidateId, which);
      if (r.error) setError(r.error);
      else window.location.reload();
    });

  const make = () =>
    start(async () => {
      setError("");
      setWhat("make");
      const r = await makeCleanResumeAction(candidateId);
      if (r.error) setError(r.error);
      else window.location.reload();
    });
  const save = () =>
    start(async () => {
      setError("");
      setWhat("save");
      const r = await saveCleanResumeAction(candidateId, text);
      if (r.error) setError(r.error);
      else window.location.reload();
    });

  return (
    <section className="panel" style={{ marginTop: 16 }}>
      <h2 style={{ fontSize: 18, margin: 0 }}>Resume</h2>
      {noResume && !hasResume && !clean && (
        <p className="notice" style={{ margin: "10px 0 0", background: "var(--rust-soft)" }}>
          <strong>No resume yet.</strong> They told us they don&rsquo;t have one. Go through their work history on the call, then click <strong>Make a clean version</strong> below to build it from the call.
        </p>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginTop: 12 }}>
        <div style={{ background: "var(--wash)", borderRadius: 12, padding: "12px 14px" }}>
          <p style={{ margin: 0, fontWeight: 800 }}>Original</p>
          <p className="small muted" style={{ margin: "2px 0 8px" }}>Exactly what they sent us. Never changed.</p>
          {hasResume ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a className="btn btn-ghost btn-small" href={`/api/resume/${candidateId}${replaced ? "?original=1" : ""}`} target="_blank" rel="noreferrer">
                Open original
              </a>
              {replaced && (
                <a className="btn btn-ghost btn-small" href={`/api/resume/${candidateId}`} target="_blank" rel="noreferrer">
                  Newer file they sent
                </a>
              )}
            </div>
          ) : (
            <p className="small" style={{ margin: 0 }}>No resume on file yet.</p>
          )}
          {replaced && originalAt && <p className="small muted" style={{ margin: "8px 0 0" }}>Replaced on {day(originalAt)}; the first one is kept.</p>}
        </div>

        <div style={{ background: clean ? "var(--moss-soft)" : "var(--marigold-soft)", borderRadius: 12, padding: "12px 14px" }}>
          <p style={{ margin: 0, fontWeight: 800 }}>Our clean version</p>
          {clean ? (
            <>
              <p className="small" style={{ margin: "2px 0 8px" }}>
                Made {day(clean.at)} by {clean.by}
                {clean.sources ? `, from ${clean.sources}` : ""}.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a className="btn btn-small" href={`/api/clean-resume/${candidateId}`} target="_blank" rel="noreferrer">
                  Open PDF
                </a>
                <a className="btn btn-ghost btn-small" href={`/api/clean-resume/${candidateId}?download=1`}>
                  Download
                </a>
                <button className="btn btn-ghost btn-small" type="button" onClick={() => setEditing(!editing)}>
                  {editing ? "Close editor" : "Edit the text"}
                </button>
              </div>
            </>
          ) : (
            <p className="small" style={{ margin: "2px 0 8px" }}>
              A polished, consistent resume made from {hasResume ? "their resume" : "what we have"} and what they told us on their call. The original stays as is.
            </p>
          )}
        </div>
      </div>

      {(clean || hasResume) && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12, padding: "10px 14px", border: "1.5px solid var(--line)", borderRadius: 12 }}>
          <strong style={{ fontSize: 15 }}>Business owners get:</strong>
          <div role="radiogroup" aria-label="Which resume owners get" style={{ display: "inline-flex", border: "1.5px solid var(--ink)", borderRadius: 99, overflow: "hidden" }}>
            {(["original", "clean"] as const).map((w) => (
              <button
                key={w}
                type="button"
                role="radio"
                aria-checked={ownerSees === w}
                disabled={pending || (w === "clean" && !clean) || (w === "original" && !hasResume)}
                onClick={() => ownerSees !== w && pick(w)}
                style={{
                  font: "inherit",
                  fontSize: 14,
                  fontWeight: 700,
                  padding: "6px 14px",
                  border: 0,
                  cursor: "pointer",
                  background: ownerSees === w ? "var(--ink)" : "transparent",
                  color: ownerSees === w ? "#fff" : "var(--ink)",
                  opacity: (w === "clean" && !clean) || (w === "original" && !hasResume) ? 0.4 : 1,
                }}
              >
                {w === "original" ? "Their original" : "Our clean version"}
              </button>
            ))}
          </div>
          <a className="small" href={`/api/resume/${candidateId}?as=owner`} target="_blank" rel="noreferrer">
            See exactly what owners get
          </a>
          {pending && what === "owner" && <span className="small muted">Saving…</span>}
        </div>
      )}

      {clean?.notes && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 14.5 }}>What changed from the original</summary>
          <pre style={{ whiteSpace: "pre-wrap", font: "inherit", fontSize: 14, margin: "6px 0 0" }}>{clean.notes}</pre>
        </details>
      )}

      {editing && (
        <div style={{ marginTop: 12 }}>
          <p className="small muted" style={{ margin: "0 0 6px" }}>
            # for the name, ## for a section, ### for a job (Title | Company | City | Dates), and - for each bullet.
          </p>
          <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} rows={22} style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13.5 }} />
          <button className="btn btn-small" type="button" disabled={pending} onClick={save} style={{ marginTop: 8 }}>
            {pending && what === "save" ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}

      {error && (
        <p className="notice" role="alert" style={{ marginTop: 10 }}>
          {error}
        </p>
      )}
      <button className={clean ? "btn btn-ghost btn-small" : "btn btn-gold btn-small"} type="button" disabled={pending} onClick={make} style={{ marginTop: 12 }}>
        {pending && what === "make" ? "Writing it… (about 30 seconds)" : clean ? "Make it again from their resume and call" : "Make a clean version"}
      </button>
    </section>
  );
}
