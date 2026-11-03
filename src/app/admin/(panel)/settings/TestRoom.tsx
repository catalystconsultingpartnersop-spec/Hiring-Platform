"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { checkTestRoom, cohostUpcomingCalls, makeTestRoom, testCandidateFromCall, testDraft } from "../../actions";

// Makes one recorded Meet room, without booking anything, to check recording works.
export function TestRoom() {
  const router = useRouter();
  const [r, setR] = useState<{ link?: string; error?: string; note?: string }>({});
  const [cohost, setCohost] = useState("");
  const [pending, start] = useTransition();
  const [check, setCheck] = useState<{ lines?: string[]; error?: string }>({});
  const [checking, startCheck] = useTransition();
  return (
    <div style={{ marginTop: 14 }}>
      <label className="field" style={{ maxWidth: 420 }}>
        <span>Co-host (optional): the Google account you&rsquo;ll join with</span>
        <input className="input" type="email" value={cohost} onChange={(e) => setCohost(e.target.value)} placeholder="e.g. a rep's Gmail" />
      </label>
      <button className="btn btn-ghost btn-small" type="button" disabled={pending} onClick={() => start(async () => setR(await makeTestRoom(cohost)))}>
        {pending ? "Making a room…" : "Make a test room"}
      </button>
      <button
        className="btn btn-ghost btn-small"
        type="button"
        style={{ marginLeft: 8 }}
        disabled={checking}
        onClick={() => startCheck(async () => setCheck(await cohostUpcomingCalls()))}
      >
        {checking ? "Working…" : "Make reps co-hosts on upcoming calls"}
      </button>
      {r.link && (
        <p className="notice notice-good" style={{ marginTop: 10 }}>
          Test room: <a href={r.link} target="_blank" rel="noopener noreferrer">{r.link}</a>
          {r.note && (
            <>
              <br />
              {r.note}
            </>
          )}
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
              if (r.id && !r.error) router.push(`/admin/candidates/${r.id}`);
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
