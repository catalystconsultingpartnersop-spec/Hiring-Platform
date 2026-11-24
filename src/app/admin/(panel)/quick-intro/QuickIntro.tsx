"use client";

import { useActionState, useState } from "react";
import { quickIntro, type QuickIntroResult } from "./actions";

const digits = (p?: string) => {
  const d = String(p ?? "").replace(/\D/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  return ten.length === 10 ? `+1${ten}` : "";
};
const smsHref = (phone: string | undefined, body: string) => `sms:${digits(phone)}?&body=${encodeURIComponent(body)}`;
const first = (n?: string) => String(n ?? "").trim().split(/\s+/)[0];

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-small btn-ghost"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => setDone(true), () => setDone(false));
      }}
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}

function Send({ label, phone, text }: { label: string; phone?: string; text: string }) {
  return (
    <div style={{ background: "var(--paper)", border: "1.5px solid var(--line)", borderRadius: 14, padding: 14, marginTop: 12 }}>
      <p style={{ margin: "0 0 10px", fontSize: 14.5, lineHeight: 1.45, overflowWrap: "anywhere" }}>{text}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a className="btn btn-gold" href={smsHref(phone, text)} style={{ flex: "1 1 160px", justifyContent: "center" }}>
          {label}
        </a>
        <Copy text={text} />
      </div>
    </div>
  );
}

export function QuickIntroForm() {
  const [state, action, pending] = useActionState<QuickIntroResult, FormData>(quickIntro, {});
  const [again, setAgain] = useState(0);

  if (state.ok && again === 0) {
    return (
      <div>
        <p className="notice notice-good" role="status">
          Done. {first(state.candName)}&rsquo;s profile is up{state.inBrowse ? " and in Browse" : ", private, just for this intro"}.
          {state.emailedOwner ? ` We emailed ${first(state.ownerName)} too.` : ""}
          {state.emailedCandidate ? ` We emailed ${first(state.candName)} the agreement to sign.` : ""}
        </p>
        <h2 style={{ fontSize: 18, margin: "20px 0 0" }}>Now send these from your phone</h2>
        <Send label={`Text ${first(state.ownerName)}`} phone={state.ownerPhone} text={state.ownerText!} />
        <Send label={`Text ${first(state.candName)}`} phone={state.candPhone} text={state.candText!} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <a className="btn btn-small btn-ghost" href={`/admin/candidates/${state.candidateId}`}>
            See or edit the profile
          </a>
          <button className="btn btn-small btn-ghost" type="button" onClick={() => setAgain(1)}>
            Another intro
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={(f) => { setAgain(0); return action(f); }} key={again}>
      <div className="grid-2">
        <label className="field">
          <span>Candidate&rsquo;s name</span>
          <input className="input" name="cand_name" required autoComplete="off" />
        </label>
        <label className="field">
          <span>
            Their phone <span className="opt">(optional)</span>
          </span>
          <input className="input" name="cand_phone" type="tel" inputMode="tel" autoComplete="off" />
        </label>
      </div>
      <label className="field" style={{ marginTop: 18 }}>
        <span>What they&rsquo;re great at</span>
        <textarea className="textarea" name="about" required placeholder="Handyman, fixes anything, reliable, great with tenants. Wants steady full-time." style={{ minHeight: 96 }} />
        <small>A sentence or two is plenty. Tap the mic on your keyboard to say it.</small>
      </label>
      <div className="grid-2" style={{ marginTop: 18 }}>
        <label className="field">
          <span>Introducing them to</span>
          <input className="input" name="owner_name" required placeholder="Moshe at Connex" autoComplete="off" />
        </label>
        <label className="field">
          <span>
            Their phone <span className="opt">(optional)</span>
          </span>
          <input className="input" name="owner_phone" type="tel" inputMode="tel" autoComplete="off" />
        </label>
      </div>
      <details style={{ marginTop: 14 }}>
        <summary style={{ cursor: "pointer", fontSize: 14, color: "var(--ink-2)" }}>Add emails (optional)</summary>
        <div className="grid-2" style={{ marginTop: 12 }}>
          <label className="field">
            <span>Candidate&rsquo;s email</span>
            <input className="input" name="cand_email" type="email" autoComplete="off" />
            <small>We&rsquo;ll email them the candidate agreement.</small>
          </label>
          <label className="field">
            <span>Owner&rsquo;s email</span>
            <input className="input" name="owner_email" type="email" autoComplete="off" />
            <small>We&rsquo;ll email them the profile too.</small>
          </label>
        </div>
      </details>
      <label className="check" style={{ marginTop: 16 }}>
        <input type="checkbox" name="browse" />
        <span>Also show them in Browse</span>
      </label>
      {state.error && (
        <p className="notice notice-bad" role="alert" style={{ marginTop: 14 }}>
          {state.error}
        </p>
      )}
      <button className="btn btn-gold" type="submit" disabled={pending} style={{ marginTop: 18, width: "100%", minHeight: 52 }}>
        {pending ? "Writing the profile…" : "Make the intro"}
      </button>
    </form>
  );
}
