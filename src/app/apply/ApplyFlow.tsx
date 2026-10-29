"use client";

import { startTransition, useActionState, useState } from "react";
import { TimePicker } from "@/components/TimePicker";
import { ApplyState, askUsToReachOut, bookTime, saveExtras, submitApplication } from "./actions";

export function ApplyFlow({
  times,
  assessmentUrl,
  startToken = null,
  startFirst = "",
}: {
  times: string[];
  assessmentUrl: string;
  startToken?: string | null;
  startFirst?: string;
}) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(
    submitApplication,
    startToken ? { ok: true, token: startToken, first: startFirst } : {},
  );
  const [booked, setBooked] = useState<{ when: string; manage: string } | null>(null);
  const [reachOut, setReachOut] = useState(false);
  const v = (k: string) => state.fields?.[k] ?? "";

  // ---------- Step 3: booked ----------
  if (booked) {
    return (
      <div className="apply-card">
        <p className="apply-step">You&rsquo;re booked</p>
        <h2>See you {booked.when}.</h2>
        <p>
          We just emailed you the details with a calendar invite and the video link. Need a different time?{" "}
          <a href={booked.manage}>Reschedule or cancel here</a>.
        </p>
        <div className="assess-nudge" style={{ marginTop: 22 }}>
          <p className="assess-nudge-title">One thing that makes the call better</p>
          <p>
            If you have 10 minutes before we talk, take the Working Genius assessment. It shows the kind of work that
            energizes you and the kind that drains you, and it&rsquo;s helped a lot of people we&rsquo;ve worked with
            find the right fit. Totally optional.
          </p>
          <a className="btn btn-small" href={assessmentUrl} target="_blank" rel="noopener noreferrer">
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
        <p className="apply-step">Step 2 of 2</p>
        <h2>Thanks, {state.first}! Now pick a time to talk.</h2>
        <p>
          A friendly 45-minute video call with one of our team. We&rsquo;ll get to know you, talk through what you&rsquo;re
          great at and what you enjoy, and figure out the kind of role where you&rsquo;d really do well. No preparation
          needed.
        </p>
        {reachOut ? (
          <p className="notice notice-good" role="status" style={{ marginTop: 18 }}>
            Got it. We&rsquo;ll reach out within one business day to find a time.
          </p>
        ) : state.token && times.length > 0 ? (
          <>
            <TimePicker
              times={times}
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
      <label className="field">
        <span>
          Resume <span className="opt">(optional, you can send it later)</span>
        </span>
        <input className="input" type="file" name="resume" accept=".pdf,.doc,.docx" />
      </label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
      <label className="check" style={{ marginTop: 18 }}>
        <input type="checkbox" name="consent" required />
        <span>
          It&rsquo;s OK to list me anonymously and share my details with employers who sign an agreement with you.
        </span>
      </label>
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
  const [state, action, pending] = useActionState<{ ok?: boolean }, FormData>(saveExtras.bind(null, token), {});
  if (state.ok) {
    return (
      <p className="notice notice-good" role="status" style={{ marginTop: 18 }}>
        Saved. Thanks, that helps.
      </p>
    );
  }
  return (
    <details className="apply-extras">
      <summary>Optional: two quick things that help us prepare</summary>
      <form action={action}>
        <label className="field" style={{ marginTop: 14 }}>
          <span>Your Working Genius result, if you have it</span>
          <input className="input" name="working_genius" placeholder="e.g. WDGEIT, or your top two like Wonder and Discernment" />
        </label>
        <label className="field">
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
