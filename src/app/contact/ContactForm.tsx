"use client";

import { useActionState, useState } from "react";
import { ContactState, sendContact } from "./actions";

export function ContactForm({
  start,
  about,
  candidateId,
  name,
  email,
}: {
  start: "hiring" | "work" | "other";
  about: string | null;
  candidateId: string | null;
  name: string;
  email: string;
}) {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, {});
  const [kind, setKind] = useState(start);
  const v = (k: string, d = "") => state.fields?.[k] ?? d;
  if (state.ok) {
    return (
      <div className="notice notice-good" role="status">
        <p style={{ margin: 0 }}>
          <strong>Got it.</strong> {kind === "work" ? "Your rep will be in touch soon." : "We'll get back to you, usually within one business day."}
        </p>
      </div>
    );
  }
  return (
    <form action={action} className="panel" style={{ display: "grid", gap: 4 }}>
      {candidateId && <input type="hidden" name="c" value={candidateId} />}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>I&rsquo;m&hellip;</legend>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(
            [
              ["hiring", "Hiring"],
              ["work", "Looking for work"],
              ["other", "Something else"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className={kind === k ? "chip chip-on" : "chip"} style={{ cursor: "pointer" }}>
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} style={{ marginRight: 6 }} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {about && (
        <p className="small muted" style={{ margin: "10px 0 0" }}>
          About: <strong>{about}</strong>
        </p>
      )}
      <div className="grid-2" style={{ marginTop: 12 }}>
        <label className="field">
          <span>Your name</span>
          <input className="input" name="name" required defaultValue={v("name", name)} autoComplete="name" />
        </label>
        <label className="field">
          <span>Email</span>
          <input className="input" type="email" name="email" required defaultValue={v("email", email)} autoComplete="email" />
        </label>
        <label className="field">
          <span>Phone, if you&rsquo;d like a call back</span>
          <input className="input" type="tel" name="phone" defaultValue={v("phone")} autoComplete="tel" />
        </label>
        <label className="field">
          <span>Best time to reach you</span>
          <input className="input" name="best_time" defaultValue={v("best_time")} placeholder="e.g. weekday mornings" />
        </label>
      </div>
      <label className="field">
        <span>How can we help?</span>
        <textarea className="textarea" name="message" rows={4} defaultValue={v("message")} />
      </label>
      {state.error && (
        <p className="notice notice-bad" role="alert" style={{ marginTop: 10 }}>
          {state.error}
        </p>
      )}
      <button className="btn btn-gold" type="submit" disabled={pending} style={{ marginTop: 14, justifySelf: "start" }}>
        {pending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
