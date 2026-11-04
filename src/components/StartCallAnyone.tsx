"use client";

import { useState, useTransition } from "react";
import { startCallWithSomeone } from "@/app/admin/actions";
import { CallReady } from "./CallReady";

// A call right now with anyone: someone the rep knows, not in the system yet.
export function StartCallAnyone({ callEmail }: { callEmail: string }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", email: "", phone: "" });
  const [emailThem, setEmailThem] = useState(true);
  const [res, setRes] = useState<{ link?: string; error?: string; emailed?: boolean; candidateId?: string; first?: string } | null>(null);
  const [pending, start] = useTransition();
  if (res?.link) return <CallReady link={res.link} first={res.first ?? f.name.split(" ")[0]} callEmail={callEmail} emailed={res.emailed} candidateId={res.candidateId} />;
  if (!open)
    return (
      <button type="button" className="btn btn-gold btn-small" onClick={() => setOpen(true)}>
        Start a call now
      </button>
    );
  return (
    <form
      className="panel"
      style={{ marginTop: 10, display: "grid", gap: 10 }}
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setRes(await startCallWithSomeone(f.name, f.email, f.phone, emailThem)));
      }}
    >
      <strong>Start a recorded call with someone</strong>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <input className="input" placeholder="Their name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        <input className="input" type="email" placeholder="Their email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        <input className="input" placeholder="Phone (optional)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      </div>
      <label className="small" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
        <input type="checkbox" checked={emailThem} onChange={(e) => setEmailThem(e.target.checked)} /> Email them the link
      </label>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn btn-gold btn-small" type="submit" disabled={pending}>
          {pending ? "Starting…" : "Start the call"}
        </button>
        <button className="btn btn-ghost btn-small" type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
        {res?.error && <span className="small" style={{ color: "var(--rust)" }}>{res.error}</span>}
      </div>
      <span className="small muted">They&rsquo;re added as your candidate, so the call, the recording and their profile all land in the right place.</span>
    </form>
  );
}
