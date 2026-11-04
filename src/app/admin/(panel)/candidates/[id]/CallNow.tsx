"use client";

import { useState, useTransition } from "react";
import { startCallNow } from "@/app/admin/actions";

// Free to talk right now? Start a recorded call and invite them.
export function CallNow({ candidateId, first, callEmail }: { candidateId: string; first: string; callEmail: string }) {
  const [email, setEmail] = useState(true);
  const [res, setRes] = useState<{ link?: string; error?: string; emailed?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  if (res?.link) {
    const wa = `https://wa.me/?text=${encodeURIComponent(`Hi ${first}, I'm on the video call now. Join me here: ${res.link}`)}`;
    return (
      <section className="panel" style={{ marginTop: 18, borderColor: "var(--marigold)" }}>
        <h2 style={{ fontSize: 18, margin: "0 0 10px" }}>Your call with {first} is ready</h2>
        <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 10 }}>
          <li>
            <a className="btn btn-gold btn-small" href={res.link} target="_blank" rel="noreferrer">
              Join the call
            </a>{" "}
            <span className="small muted">Join signed in to Google as {callEmail} so it records.</span>
          </li>
          <li>
            {res.emailed ? <span className="small">Emailed {first} the link ✓ </span> : <span className="small">Send {first} the link: </span>}
            <a className="btn btn-ghost btn-small" href={wa} target="_blank" rel="noreferrer">
              WhatsApp
            </a>{" "}
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(res.link!);
                  setCopied(true);
                } catch {}
              }}
            >
              {copied ? "Copied ✓" : "Copy link"}
            </button>
          </li>
          <li className="small muted">Afterwards, mark it Done on My calls. The profile is drafted from the call and emailed to you.</li>
        </ol>
      </section>
    );
  }

  return (
    <section className="panel" style={{ marginTop: 18, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <span>
        <strong>Free to talk now?</strong> <span className="small muted">Start a recorded call and invite {first}.</span>
      </span>
      <label className="small" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
        <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} /> Email them the link
      </label>
      <button
        type="button"
        className="btn btn-gold btn-small"
        disabled={pending}
        onClick={() => start(async () => setRes(await startCallNow(candidateId, email)))}
      >
        {pending ? "Starting…" : "Start a call now"}
      </button>
      {res?.error && <span className="small" style={{ color: "var(--rust)" }}>{res.error}</span>}
    </section>
  );
}
