"use client";

import { useState } from "react";

export function ShareBox({ link, message }: { link: string; message: string }) {
  const [copied, setCopied] = useState<"" | "link" | "msg">("");
  const copy = (t: string, k: "link" | "msg") => navigator.clipboard?.writeText(t).then(() => setCopied(k), () => null);
  return (
    <div className="panel" style={{ borderColor: "var(--marigold)" }}>
      <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>Your link</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <code style={{ fontSize: 15, padding: "8px 12px", background: "#f4f6fa", borderRadius: 8, wordBreak: "break-all" }}>{link}</code>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => copy(link, "link")}>
          {copied === "link" ? "Copied ✓" : "Copy link"}
        </button>
      </div>
      <h3 style={{ fontSize: 15, margin: "16px 0 6px" }}>A message you can send</h3>
      <p style={{ whiteSpace: "pre-line", margin: "0 0 10px", padding: "10px 12px", background: "#f4f6fa", borderRadius: 8 }}>{message}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a className="btn btn-gold btn-small" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
          Send on WhatsApp
        </a>
        <a className="btn btn-ghost btn-small" href={`sms:?&body=${encodeURIComponent(message)}`}>
          Send by text
        </a>
        <a className="btn btn-ghost btn-small" href={`mailto:?subject=${encodeURIComponent("Hiring? Take a look at this")}&body=${encodeURIComponent(message)}`}>
          Send by email
        </a>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => copy(message, "msg")}>
          {copied === "msg" ? "Copied ✓" : "Copy message"}
        </button>
      </div>
      <p className="small muted" style={{ margin: "10px 0 0" }}>Feel free to make the message your own. Just keep the link in it.</p>
    </div>
  );
}
