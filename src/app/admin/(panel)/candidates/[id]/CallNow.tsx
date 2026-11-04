"use client";

import { useState, useTransition } from "react";
import { startCallNow } from "@/app/admin/actions";
import { CallReady } from "@/components/CallReady";

// Free to talk right now? Start a recorded call and invite them.
export function CallNow({ candidateId, first, callEmail }: { candidateId: string; first: string; callEmail: string }) {
  const [email, setEmail] = useState(true);
  const [res, setRes] = useState<{ link?: string; error?: string; emailed?: boolean } | null>(null);
  const [pending, start] = useTransition();

  if (res?.link) return <CallReady link={res.link} first={first} callEmail={callEmail} emailed={res.emailed} />;

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
