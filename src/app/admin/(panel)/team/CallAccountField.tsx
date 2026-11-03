"use client";

import { useState, useTransition } from "react";
import { setCallAccountAction } from "../../actions";

// The rep's company Google account for recorded calls.
export function CallAccountField({ staffId, value }: { staffId: string; value: string }) {
  const [v, setV] = useState(value);
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [pending, start] = useTransition();
  return (
    <div style={{ marginTop: 6 }}>
      <label className="small muted" style={{ display: "block" }}>
        Google account for calls
      </label>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <input
          className="input"
          type="email"
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="name@thecandidatecollection.com"
          style={{ maxWidth: 280, padding: "6px 10px", fontSize: 14 }}
        />
        <button
          className="btn btn-small btn-ghost"
          type="button"
          disabled={pending || v.trim() === value}
          onClick={() => start(async () => setMsg(await setCallAccountAction(staffId, v)))}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {msg.ok && <div className="small" style={{ color: "var(--moss)" }}>{msg.ok}</div>}
      {msg.error && <div className="small error">{msg.error}</div>}
    </div>
  );
}
