"use client";

import { useState, useTransition } from "react";
import { signInLinkFor } from "../../actions";

// For when emails aren't reaching someone: a sign-in link to send them yourself.
export function CopySignIn({ staffId, first }: { staffId: string; first: string }) {
  const [msg, setMsg] = useState("");
  const [link, setLink] = useState("");
  const [pending, start] = useTransition();
  return (
    <div style={{ marginTop: 6 }}>
      <button
        type="button"
        className="btn btn-small btn-ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await signInLinkFor(staffId);
            if (!r.link) return setMsg(r.error ?? "Something went wrong.");
            setLink(r.link);
            try {
              await navigator.clipboard.writeText(r.link);
              setMsg(`Copied. Send it to ${first}; it works once, for 7 days.`);
            } catch {
              setMsg(`Send this to ${first}; it works once, for 7 days.`);
            }
          })
        }
      >
        {pending ? "Making link…" : "Copy sign-in link"}
      </button>
      {msg && <div className="small" style={{ marginTop: 4, color: "var(--moss)" }}>{msg}</div>}
      {link && (
        <input className="input" readOnly value={link} onFocus={(e) => e.target.select()} style={{ marginTop: 4, fontSize: 12, minHeight: 32 }} />
      )}
      {link && (
        <a className="small" href={`https://wa.me/?text=${encodeURIComponent(`Here's your link to sign in to The Candidate Collection: ${link}`)}`} target="_blank" rel="noreferrer">
          Send on WhatsApp
        </a>
      )}
    </div>
  );
}
