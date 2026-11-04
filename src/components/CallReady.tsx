"use client";

import { useState } from "react";

// After a call is started on the spot: join it, and get the link to the person.
export function CallReady({ link, first, callEmail, emailed, candidateId }: { link: string; first: string; callEmail: string; emailed?: boolean; candidateId?: string }) {
  const [copied, setCopied] = useState(false);
  const wa = `https://wa.me/?text=${encodeURIComponent(`Hi ${first}, I'm on the video call now. Join me here: ${link}`)}`;
  return (
    <section className="panel" style={{ marginTop: 14, borderColor: "var(--marigold)" }}>
      <h2 style={{ fontSize: 18, margin: "0 0 10px" }}>Your call with {first} is ready</h2>
      <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 10 }}>
        <li>
          <a className="btn btn-gold btn-small" href={link} target="_blank" rel="noreferrer">
            Join the call
          </a>{" "}
          <span className="small muted">Join signed in to Google as {callEmail} so it records.</span>
        </li>
        <li>
          {emailed ? <span className="small">Emailed {first} the link ✓ </span> : <span className="small">Send {first} the link: </span>}
          <a className="btn btn-ghost btn-small" href={wa} target="_blank" rel="noreferrer">
            WhatsApp
          </a>{" "}
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              } catch {}
            }}
          >
            {copied ? "Copied ✓" : "Copy link"}
          </button>
        </li>
        <li className="small muted">
          Afterwards, mark it Done on My calls. Their profile is drafted from the call and emailed to you
          {candidateId ? (
            <>
              {" "}
              (<a href={`/admin/candidates/${candidateId}`}>their page</a>)
            </>
          ) : null}
          .
        </li>
      </ol>
    </section>
  );
}
