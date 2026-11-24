"use client";

import { useState, useTransition } from "react";
import { sendMatch } from "./actions";
import styles from "./matches.module.css";

const digits = (p?: string) => {
  const d = String(p ?? "").replace(/\D/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  return ten.length === 10 ? `+1${ten}` : "";
};

// "Send to owner": the site writes it, the rep sends it from their own phone (and we
// email it when we have the owner's email). Then the match is tracked.
export function SendToOwner({ positionId, candidateId, label = "Send to owner" }: { positionId: string; candidateId: string; label?: string }) {
  const [busy, go] = useTransition();
  const [r, setR] = useState<{ error?: string; text?: string; phone?: string; emailed?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  if (r?.text)
    return (
      <div className={styles.sent} style={{ width: "min(360px, 100%)" }}>
        {r.emailed ? <b>Emailed to the owner. </b> : null}
        {r.text}
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <a className="btn btn-gold btn-small" href={`sms:${digits(r.phone)}?&body=${encodeURIComponent(r.text)}`}>
            Text it
          </a>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => navigator.clipboard?.writeText(r.text!).then(() => setCopied(true), () => null)}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    );
  return (
    <>
      <button type="button" className="btn btn-gold btn-small" disabled={busy} onClick={() => go(async () => setR(await sendMatch(positionId, candidateId)))}>
        {busy ? "…" : label}
      </button>
      {r?.error && <span className="small" style={{ color: "#7d2a1e" }}>{r.error}</span>}
    </>
  );
}
