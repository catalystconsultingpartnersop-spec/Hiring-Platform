"use client";

import { HOURS } from "@/lib/hours";
import { LANGUAGES } from "@/lib/languages";
import { AVAILABILITY } from "@/lib/availability";
import { UploadHelper } from "@/components/UploadHelper";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { TimePicker } from "@/components/TimePicker";
import { ApplyState, askUsToReachOut, bookTime, saveExtras, submitApplication } from "./actions";

export function ApplyFlow({
  times,
  startToken = null,
  startFirst = "",
  agreement,
  reps = [],
  referred = null,
}: {
  times: string[];
  agreement: { how: string[]; ask: string[] };
  reps?: [string, string][];
  referred?: string | null;
  startToken?: string | null;
  startFirst?: string;
}) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(
    submitApplication,
    startToken ? { ok: true, token: startToken, first: startFirst } : {},
  );
  const [booked, setBooked] = useState<{ when: string; manage: string } | null>(null);
  const [reachOut, setReachOut] = useState(false);
  const [noResume, setNoResume] = useState(false);
  const [showNoResume, setShowNoResume] = useState(false);
  const v = (k: string) => state.fields?.[k] ?? "";

  // ---------- Step 3: booked ----------
  if (booked) {
    return (
      <div className="apply-card">
        <ScrollHere />
        <p className="apply-step">You&rsquo;re booked</p>
        <h2>See you {booked.when}.</h2>
        <p>
          We just emailed you the details with a calendar invite and the video link. Need a different time?{" "}
          <a href={booked.manage}>Reschedule or cancel here</a>.
        </p>
        <div className="assess-nudge" style={{ marginTop: 22 }}>
          <p className="assess-nudge-title">Before your call: take our Strengths Assessment</p>
          <p>
            It&rsquo;s free, takes about 8 minutes, and shows the kind of work that gives you energy and the kind that drains you.
            Taking it before we talk makes our call much more useful, because we can spend the time on you and where
            you&rsquo;d shine.
          </p>
          <a className="btn btn-gold btn-small" href={`/strengths${state.token ? `?t=${encodeURIComponent(state.token)}` : ""}`} target="_blank" rel="noopener noreferrer">
            Take the assessment
          </a>
        </div>
        {state.token && <Extras token={state.token} />}
        <p className="notice" style={{ marginTop: 18 }}>
          <strong>You have your own page now.</strong> It shows where things stand, every step of the way.{" "}
          <a href="/me">See your page</a>
        </p>
        <Contact />
      </div>
    );
  }

  // ---------- Step 2: pick a time ----------
  if (state.ok) {
    return (
      <div className="apply-card">
        <ScrollHere />
        <p className="apply-step">Step 2 of 2</p>
        <h2>Thanks, {state.first}! Now pick a time to talk.</h2>
        <p>
          A friendly 30- to 45-minute video call with one of our team. We&rsquo;ll get to know you, talk through what you&rsquo;re
          great at and what you enjoy, and figure out the kind of role where you&rsquo;d really do well. No preparation
          needed.
        </p>
        {reachOut ? (
          <p className="notice notice-good" role="status" style={{ marginTop: 18 }}>
            Got it. We&rsquo;ll reach out within one business day to find a time.
          </p>
        ) : state.token && (state.times ?? times).length > 0 ? (
          <>
            <TimePicker
              times={state.times ?? times}
              onBook={async (iso, tz) => {
                const r = await bookTime(state.token!, iso, tz);
                if (r.ok) setBooked({ when: r.when!, manage: r.manage! });
                return r;
              }}
            />
            <button
              type="button"
              className="linkish"
              onClick={() => startTransition(async () => {
                await askUsToReachOut(state.token!);
                setReachOut(true);
              })}
            >
              None of these work? Ask us to reach out instead.
            </button>
          </>
        ) : (
          <div className="notice" style={{ marginTop: 18 }}>
            <p>
              We&rsquo;re lining up new times for calls right now.
              {state.token ? " Tap below and we'll reach out within one business day to find a time." : " We'll reach out within one business day."}
            </p>
            {state.token && (
              <button
                type="button"
                className="btn btn-small"
                style={{ marginTop: 12 }}
                onClick={() => startTransition(async () => {
                  await askUsToReachOut(state.token!);
                  setReachOut(true);
                })}
              >
                Please reach out to me
              </button>
            )}
          </div>
        )}
        <Contact />
      </div>
    );
  }

  // ---------- Step 1: the basics ----------
  return (
    <form
      className="apply-card"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <UploadHelper />
      <p className="apply-step">Step 1 of 2</p>
      <h2>A few basics</h2>
      <p className="muted">Takes about a minute. Then you&rsquo;ll pick a time to talk.</p>

      <div className="grid-2" style={{ marginTop: 18 }}>
        <label className="field">
          <span>Your name</span>
          <input className="input" name="full_name" required autoComplete="name" defaultValue={v("full_name")} />
        </label>
        <label className="field">
          <span>Email</span>
          <input className="input" type="email" name="email" required autoComplete="email" defaultValue={v("email")} />
        </label>
      </div>
      <label className="field" style={{ marginTop: 18 }}>
        <span>Phone</span>
        <input className="input" type="tel" name="phone" required autoComplete="tel" defaultValue={v("phone")} />
      </label>
      <label className="field">
        <span>What kind of work are you hoping for?</span>
        <textarea
          className="textarea"
          name="looking_for"
          required
          rows={3}
          style={{ minHeight: 90 }}
          defaultValue={v("looking_for")}
          placeholder="A sentence is plenty. It's fine if you're not sure yet; that's what the call is for."
        />
      </label>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: "0 0 18px" }}>
        <legend style={{ fontWeight: 700, marginBottom: 8, padding: 0 }}>
          Full-time or part-time? <span className="opt">(optional)</span>
        </legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
          {HOURS.map(([val, label]) => (
            <label key={val} style={{ display: "inline-flex", gap: 6, alignItems: "center", fontWeight: 500 }}>
              <input type="radio" name="hours" value={val} style={{ width: 18, height: 18, margin: 0 }} /> {val === "either" ? "Either works" : label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: "0 0 18px" }}>
        <legend style={{ fontWeight: 700, marginBottom: 8, padding: 0 }}>
          When could you start? <span className="opt">(optional)</span>
        </legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
          {AVAILABILITY.map((a) => (
            <label key={a.value} style={{ display: "inline-flex", gap: 6, alignItems: "center", fontWeight: 500 }}>
              <input type="radio" name="available" value={a.value} style={{ width: 18, height: 18, margin: 0 }} /> {a.label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: "0 0 18px" }}>
        <legend style={{ fontWeight: 700, marginBottom: 8, padding: 0 }}>
          Languages you speak fluently <span className="opt">(optional)</span>
        </legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
          {LANGUAGES.map((l) => (
            <label key={l} style={{ display: "inline-flex", gap: 6, alignItems: "center", fontWeight: 500 }}>
              <input type="checkbox" name="languages" value={l} style={{ width: 18, height: 18, margin: 0 }} /> {l}
            </label>
          ))}
        </div>
        <input className="input" name="languages" placeholder="Any others? e.g. Polish, Arabic" style={{ marginTop: 10 }} />
      </fieldset>
      {reps.length > 0 && (
        <label className="field">
          <span>
            Choose your rep <span className="opt">(optional)</span>
          </span>
          <select className="select" name="rep" defaultValue={v("rep") || referred || ""}>
            <option value="">No preference, match me with someone</option>
            {reps.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <small>Your rep has your call with you and helps you the whole way. If one of our team sent you, pick them.</small>
        </label>
      )}
      <label className="field">
        <span>Upload your resume</span>
        <input className="input" type="file" name="resume" accept=".pdf,.doc,.docx,image/jpeg,image/png" required={!noResume} disabled={noResume} />
        <small>A PDF, Word file or a clear photo of it. Needed to book your call. It doesn&rsquo;t need to be perfect; we&rsquo;ll help you polish it.</small>
      </label>
      <div style={{ margin: "-6px 0 16px", fontSize: 13, color: "var(--ink-3)" }}>
        {!showNoResume ? (
          <button type="button" onClick={() => setShowNoResume(true)} style={{ font: "inherit", fontSize: 13, color: "var(--ink-3)", background: "none", border: 0, padding: 0, textDecoration: "underline", cursor: "pointer" }}>
            No resume at all?
          </button>
        ) : (
          <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontWeight: 400 }}>
            <input type="checkbox" name="no_resume" checked={noResume} onChange={(e) => setNoResume(e.target.checked)} style={{ width: 14, height: 14, margin: 0 }} />
            I truly don&rsquo;t have one. I&rsquo;ll go over my work history on the call.
          </label>
        )}
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
      <div className="apply-agreement" style={{ marginTop: 20, padding: "14px 16px", background: "var(--wash)", borderRadius: 12 }}>
        <p style={{ margin: "0 0 6px", fontWeight: 700 }}>Your candidate agreement</p>
        <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 4, fontSize: 15 }}>
          {[...agreement.how, ...agreement.ask].map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <label className="check" style={{ marginTop: 12 }}>
          <input type="checkbox" name="consent" required />
          <span>
            I agree to my candidate agreement. It&rsquo;s OK to list me anonymously and share my details with employers who
            sign to meet me.
          </span>
        </label>
      </div>
      {state.error && (
        <p className="notice notice-bad" role="alert" style={{ marginTop: 16 }}>
          {state.error}
        </p>
      )}
      <button className="btn btn-gold" type="submit" disabled={pending} style={{ marginTop: 20 }}>
        {pending ? "One moment…" : "Next: pick a time"}
      </button>
      <Contact />
    </form>
  );
}

function Extras({ token }: { token: string }) {
  const [state, action, pending] = useActionState<{ ok?: boolean; error?: string }, FormData>(saveExtras.bind(null, token), {});
  if (state.ok) {
    return (
      <p className="notice notice-good" role="status" style={{ marginTop: 18 }}>
        Saved. Thanks, that helps.
      </p>
    );
  }
  return (
    <details className="apply-extras">
      <summary>Optional: one quick thing that helps us prepare</summary>
      <form action={action}>
        <label className="field" style={{ marginTop: 14 }}>
          <span>Any companies that should never see your profile?</span>
          <input className="input" name="never_show_to" placeholder="e.g. your current employer" />
          <small>
            We&rsquo;ll do our best to keep you hidden from anyone at these companies, but we can&rsquo;t guarantee it, since
            someone could sign up with a personal email.
          </small>
        </label>
        <button className="btn btn-small" type="submit" disabled={pending} style={{ marginTop: 14 }}>
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
    </details>
  );
}

function Contact() {
  return (
    <p className="apply-contact">
      Questions? <a href="/contact?kind=work">Send us a note</a> and we&rsquo;ll get back to you. We&rsquo;re happy to help.
    </p>
  );
}

// When a new step appears, bring its top into view (on phones the page would
// otherwise stay scrolled down at the bottom of the previous step).
function ScrollHere() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current?.closest(".apply-card");
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);
  return <span ref={ref} aria-hidden="true" />;
}
