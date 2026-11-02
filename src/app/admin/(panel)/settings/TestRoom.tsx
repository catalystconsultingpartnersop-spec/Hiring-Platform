"use client";

import { useState, useTransition } from "react";
import { checkTestRoom, makeTestRoom, testCandidateFromCall, testDraft } from "../../actions";

// Makes one recorded Meet room, without booking anything, to check recording works.
export function TestRoom() {
  const [r, setR] = useState<{ link?: string; error?: string }>({});
  const [pending, start] = useTransition();
  const [check, setCheck] = useState<{ lines?: string[]; error?: string }>({});
  const [checking, startCheck] = useTransition();
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
      <button
        className="btn btn-ghost btn-small"
        type="button"
        style={{ marginTop: 10 }}
        disabled={checking}
        onClick={() => startCheck(async () => setCheck(await checkTestRoom()))}
      >
        {checking ? "Checking with Google…" : "Check the test room"}
      </button>
      {check.lines && (
        <div className="notice" style={{ marginTop: 10 }}>
          {check.lines.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
      )}
      {check.error && <p className="notice notice-bad" style={{ marginTop: 10 }}>{check.error}</p>}
      <div>
        <button
          className="btn btn-ghost btn-small"
          type="button"
          style={{ marginTop: 10 }}
          disabled={checking}
          onClick={() => startCheck(async () => setCheck(await testDraft()))}
        >
          {checking ? "Working…" : "Draft a sample profile from the test call"}
        </button>
      </div>
      <div>
        <button
          className="btn btn-gold btn-small"
          type="button"
          style={{ marginTop: 10 }}
          disabled={checking}
          onClick={() =>
            startCheck(async () => {
              const r = await testCandidateFromCall();
              if (r.id && !r.error) window.location.href = `/admin/candidates/${r.id}`;
              else setCheck({ error: r.error ?? "Something went wrong." });
            })
          }
        >
          {checking ? "Working… (about 30 seconds)" : "Full test: make a test candidate from the test call"}
        </button>
      </div>
    </div>
  );
}
