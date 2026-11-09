"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { sendToRep } from "@/app/candidates/talkActions";

const KINDS = [
  ["call", "📞 Please call me"],
  ["question", "❓ I have a question"],
] as const;

// "Talk to Dovid": the owner messages the rep who met this candidate.
export function TalkToRep({
  candidateId,
  rep,
  signedIn,
  defaults,
  thread,
  cutOff,
}: {
  candidateId: string;
  rep: string; // the rep's first name, or "our team"
  signedIn: boolean;
  defaults: { name: string; company: string; phone: string };
  thread: { link: string; count: number; lastFromRep: boolean } | null;
  cutOff: boolean;
}) {
  const [kind, setKind] = useState<"" | "call" | "question">("");
  const [state, action, pending] = useActionState(sendToRep, null);
  const who = rep === "our team" ? "our team" : rep;
  const he = rep === "our team" ? "we" : rep;

  if (cutOff)
    return (
      <div className="rep-call">
        <p className="rep-call-k">Talk to {who}</p>
        <p className="small">
          You&rsquo;ve reached the limit of free conversation with our team. When you&rsquo;re ready, see who this candidate is and talk to them directly. <Link href="/hiring-help">Hiring help</Link> covers how it works.
        </p>
      </div>
    );

  if (state?.ok)
    return (
      <div className="rep-call rep-call-done" role="status">
        <p className="rep-call-k">✓ Sent to {state.rep}</p>
        <p>
          {state.rep === "Heshy" ? "We'll" : `${state.rep} will`} get back to you soon. We&rsquo;ll email you when there&rsquo;s an answer.
        </p>
        <a className="btn btn-ghost btn-small" href={state.link}>
          Open the conversation
        </a>
      </div>
    );

  if (thread && !kind)
    return (
      <div className="rep-call">
        <p className="rep-call-k">Your conversation with {who}</p>
        <p className="small">{thread.lastFromRep ? `${he.charAt(0).toUpperCase() + he.slice(1)} answered you.` : "Sent. We'll email you when there's an answer."}</p>
        <a className="btn btn-ghost rep-call-btn" href={thread.link}>
          Open the conversation
        </a>
      </div>
    );

  return (
    <div className="rep-call">
      <p className="rep-call-k">Talk to {who}</p>
      <p className="rep-call-h">
        {who === "our team" ? "We" : who} met them in person. Ask {who === "our team" ? "us" : who} anything about them, free, before you decide.
      </p>
      <div className="rep-call-kinds" role="radiogroup" aria-label="What would you like?">
        {KINDS.map(([v, l]) => (
          <button key={v} type="button" role="radio" aria-checked={kind === v} className={`rep-call-kind ${kind === v ? "on" : ""}`} onClick={() => setKind(v)}>
            {l}
          </button>
        ))}
      </div>
      {kind && (
        <form action={action} className="rep-call-form">
          <input type="hidden" name="candidate_id" value={candidateId} />
          <input type="hidden" name="kind" value={kind} />
          {kind === "question" ? (
            <label className="field">
              <span>Your question</span>
              <textarea className="textarea" name="text" rows={3} required placeholder="e.g. How are they with customers?" />
            </label>
          ) : (
            <>
              <label className="field">
                <span>Phone</span>
                <input className="input" name="phone" type="tel" defaultValue={defaults.phone} required autoComplete="tel" />
              </label>
              <label className="field">
                <span>Best time</span>
                <select className="select" name="when" defaultValue="As soon as possible">
                  {["As soon as possible", "In the morning", "In the afternoon", "In the evening"].map((w) => (
                    <option key={w}>{w}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          <label className="field">
            <span>Your name</span>
            <input className="input" name="name" defaultValue={defaults.name} required autoComplete="name" />
          </label>
          {!signedIn && (
            <label className="field">
              <span>Email (for the answer)</span>
              <input className="input" name="email" type="email" required autoComplete="email" />
            </label>
          )}
          <label className="field">
            <span>
              Business <span className="muted">(optional)</span>
            </span>
            <input className="input" name="company" defaultValue={defaults.company} autoComplete="organization" />
          </label>
          {state && !state.ok && (
            <p className="notice notice-bad" role="alert">
              {state.error === "cutoff" ? "You've reached the limit of free conversation." : state.error}
            </p>
          )}
          <button className="btn btn-gold" type="submit" disabled={pending} style={{ width: "100%" }}>
            {pending ? "Sending…" : `Send to ${who === "our team" ? "us" : who}`}
          </button>
        </form>
      )}
    </div>
  );
}
