"use client";

import { useActionState, useState } from "react";
import { requestRepCall } from "@/app/candidates/repCallActions";
import { WHEN_OPTIONS } from "@/lib/repCallOptions";

// "Talk to Mechel first": a free 10-minute call with the rep who met the candidate.
export function RepCall({
  candidateId,
  rep,
  left,
  signedIn,
  defaults,
}: {
  candidateId: string;
  rep: string; // first name, or "our team"
  left: number | null; // free calls left, when we know who's asking
  signedIn: boolean;
  defaults: { name: string; company: string; phone: string };
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(requestRepCall, null);
  const who = rep === "our team" ? "our team" : rep;

  if (state?.ok)
    return (
      <div className="rep-call rep-call-done" role="status">
        <p className="rep-call-k">✓ You&rsquo;re all set</p>
        <p>
          <strong>{state.rep}</strong> will call you {state.when.toLowerCase()} for a free 10-minute call about this candidate. We
          emailed you a confirmation.
        </p>
        {state.left > 0 && <p className="small muted">You have {state.left} more free call{state.left === 1 ? "" : "s"}, for any candidate.</p>}
      </div>
    );

  if (left === 0)
    return (
      <div className="rep-call">
        <p className="rep-call-k">Talk to {who}</p>
        <p className="small">
          You&rsquo;ve used your 2 free calls. Questions about this candidate? <a href={`/contact?c=${candidateId}`}>Send us a note</a>.
        </p>
      </div>
    );

  return (
    <div className="rep-call">
      <p className="rep-call-k">Talk to {who} first</p>
      <p className="rep-call-h">
        {who === "our team" ? "We" : who} met them in person. Get a <strong>free 10-minute call</strong> to hear about them before you decide.
      </p>
      {!open ? (
        <button type="button" className="btn btn-ghost rep-call-btn" onClick={() => setOpen(true)}>
          📞 Get a free 10-minute call
        </button>
      ) : (
        <form action={action} className="rep-call-form">
          <input type="hidden" name="candidate_id" value={candidateId} />
          <label className="field">
            <span>Your name</span>
            <input className="input" name="name" defaultValue={defaults.name} required autoComplete="name" />
          </label>
          <label className="field">
            <span>Business</span>
            <input className="input" name="company" defaultValue={defaults.company} autoComplete="organization" />
          </label>
          <label className="field">
            <span>Phone</span>
            <input className="input" name="phone" type="tel" defaultValue={defaults.phone} required autoComplete="tel" />
          </label>
          {!signedIn && (
            <label className="field">
              <span>Email</span>
              <input className="input" name="email" type="email" required autoComplete="email" />
            </label>
          )}
          <label className="field">
            <span>Best time to call</span>
            <select className="select" name="when" defaultValue="soon">
              {WHEN_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>
              Anything you want to ask? <span className="muted">(optional)</span>
            </span>
            <textarea className="textarea" name="note" rows={2} />
          </label>
          {state && !state.ok && (
            <p className="notice notice-bad" role="alert">
              {state.error}
            </p>
          )}
          <button className="btn btn-gold" type="submit" disabled={pending} style={{ width: "100%" }}>
            {pending ? "Sending…" : `Have ${who === "our team" ? "us" : who} call me`}
          </button>
          <p className="small muted" style={{ margin: 0 }}>
            Free. Every business gets 2 free calls with our team{left != null ? `, and you have ${left} left` : ""}.
          </p>
        </form>
      )}
    </div>
  );
}
