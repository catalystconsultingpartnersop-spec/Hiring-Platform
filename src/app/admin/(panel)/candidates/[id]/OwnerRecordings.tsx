"use client";

import { useState, useTransition } from "react";
import { ownerCallFiles } from "@/app/admin/actions";

type Call = { when: string | null; videos: string[]; transcripts: string[]; notes: string[]; pending: boolean };

// Heshy only: straight to the call's video, transcript and notes in Google Drive.
// This component is only ever rendered for him, and the server checks again.
export function OwnerRecordings({ candidateId }: { candidateId: string }) {
  const [calls, setCalls] = useState<Call[] | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const load = () =>
    start(async () => {
      const r = await ownerCallFiles(candidateId);
      setError(r.error ?? "");
      setCalls(r.calls ?? null);
    });
  const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" }) : "Call");
  const links = (label: string, urls: string[]) =>
    urls.map((u, i) => (
      <a key={u} className="btn btn-small btn-ghost" href={u} target="_blank" rel="noreferrer">
        {label}
        {urls.length > 1 ? ` ${i + 1}` : ""} ↗
      </a>
    ));
  return (
    <section className="panel" style={{ marginTop: 14, borderStyle: "dashed" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <strong>🎥 Call recording and notes</strong> <span className="tag">Only you see this</span>
          <div className="small muted">Opens the video, transcript and notes in Google Drive.</div>
        </div>
        {!calls && (
          <button type="button" className="btn btn-small" onClick={load} disabled={pending}>
            {pending ? "Looking…" : "Find them"}
          </button>
        )}
      </div>
      {error && <p className="notice notice-bad small" style={{ marginBottom: 0 }}>{error}</p>}
      {calls && calls.length === 0 && <p className="small muted" style={{ margin: "10px 0 0" }}>No recorded call for this candidate.</p>}
      {calls?.map((c, i) => {
        const none = !c.videos.length && !c.transcripts.length && !c.notes.length;
        return (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
            <span className="small" style={{ fontWeight: 700, minWidth: 92 }}>{day(c.when)}</span>
            {links("Video", c.videos)}
            {links("Transcript", c.transcripts)}
            {links("Notes", c.notes)}
            {none && <span className="small muted">{c.pending ? "Google is still saving this one. Try again in a few minutes." : "Nothing was recorded on this call."}</span>}
          </div>
        );
      })}
      {calls && calls.length > 0 && (
        <p className="small muted" style={{ margin: "10px 0 0" }}>
          The files open in Google. Be signed in to the Google account that hosts the calls.
        </p>
      )}
    </section>
  );
}
