"use client";

import { useState, useTransition } from "react";
import { makeTestRoom } from "../../actions";

// Makes one recorded Meet room, without booking anything, to check recording works.
export function TestRoom() {
  const [r, setR] = useState<{ link?: string; error?: string }>({});
  const [pending, start] = useTransition();
  return (
    <div style={{ marginTop: 14 }}>
      <button className="btn btn-ghost btn-small" type="button" disabled={pending} onClick={() => start(async () => setR(await makeTestRoom()))}>
        {pending ? "Making a room…" : "Make a test room"}
      </button>
      {r.link && (
        <p className="notice notice-good" style={{ marginTop: 10 }}>
          Test room: <a href={r.link} target="_blank" rel="noopener noreferrer">{r.link}</a>
        </p>
      )}
      {r.error && <p className="notice notice-bad" style={{ marginTop: 10 }}>{r.error}</p>}
    </div>
  );
}
