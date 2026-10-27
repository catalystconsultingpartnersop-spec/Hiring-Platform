"use client";

import { useActionState } from "react";
import { ApplyState, submitApplication } from "./actions";

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <span>
      {text}
      {required ? (
        <span className="req" aria-hidden="true">
          {" "}
          *
        </span>
      ) : (
        <span className="opt"> (optional)</span>
      )}
    </span>
  );
}

export function ApplyForm({ assessmentUrl }: { assessmentUrl: string }) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(submitApplication, {});
  const v = (k: string) => state.fields?.[k] ?? "";

  if (state.ok) {
    return (
      <div className="notice notice-good" role="status">
        <p>
          <strong>Application sent.</strong> Check your email for a confirmation. We&rsquo;ll be in touch to set up
          your first coaching conversation.
        </p>
      </div>
    );
  }

  return (
    <form action={action} encType="multipart/form-data" key={JSON.stringify(state.fields ?? {})}>
      <p className="small muted" style={{ marginBottom: 18 }}>
        Fields marked <span className="req">*</span> are required. Everything else helps but can wait.
      </p>

      <div className="grid-2">
        <label className="field">
          <Label text="Full name" required />
          <input className="input" name="full_name" required autoComplete="name" defaultValue={v("full_name")} />
        </label>
        <label className="field">
          <Label text="Email" required />
          <input className="input" type="email" name="email" required autoComplete="email" defaultValue={v("email")} />
        </label>
        <label className="field">
          <Label text="Phone" />
          <input className="input" type="tel" name="phone" autoComplete="tel" defaultValue={v("phone")} />
        </label>
        <label className="field">
          <Label text="Where you live" />
          <input className="input" name="location" placeholder="City and state or country" defaultValue={v("location")} />
        </label>
      </div>

      <label className="field" style={{ marginTop: 18 }}>
        <Label text="What kind of work do you want?" required />
        <textarea
          className="textarea"
          name="looking_for"
          required
          defaultValue={v("looking_for")}
          placeholder="Roles you're drawn to, or just what you enjoy and what drains you. It's fine if you're not sure yet."
        />
      </label>

      <div className="grid-2" style={{ marginTop: 18 }}>
        <label className="field">
          <Label text="Experience" />
          <select className="select" name="experience" defaultValue={v("experience")}>
            <option value="">Choose one</option>
            <option>Just starting out</option>
            <option>A few years</option>
            <option>Many years</option>
            <option>Senior or leadership</option>
          </select>
        </label>
        <label className="field">
          <Label text="Work setting" />
          <select className="select" name="work_mode" defaultValue={v("work_mode")}>
            <option value="">Choose one</option>
            <option>On-site</option>
            <option>Hybrid</option>
            <option>Remote</option>
            <option>Open to anything</option>
          </select>
        </label>
        <label className="field">
          <Label text="Salary you're looking for" />
          <input className="input" name="salary" placeholder="e.g. $70,000–$85,000" defaultValue={v("salary")} />
        </label>
        <label className="field">
          <Label text="LinkedIn" />
          <input className="input" name="linkedin_url" placeholder="linkedin.com/in/yourname" defaultValue={v("linkedin_url")} />
        </label>
      </div>

      <label className="field" style={{ marginTop: 18 }}>
        <Label text="Tell us about yourself" />
        <textarea
          className="textarea"
          name="about"
          defaultValue={v("about")}
          placeholder="What you've done, what you're proud of, what kind of boss and team you do best with."
        />
      </label>

      <div className="assess-nudge">
        <p className="assess-nudge-title">Take the Working Genius assessment first. We strongly recommend it.</p>
        <p>
          It takes about 10 minutes and shows the kind of work that energizes you and the kind that drains you. We use
          it to match you with roles where you&rsquo;ll actually do well, and it has made a real difference for the
          people we&rsquo;ve placed. You can still apply without it, and we&rsquo;ll go through it together later.
        </p>
        <a className="btn btn-small" href={assessmentUrl} target="_blank" rel="noopener noreferrer">
          Take the assessment
        </a>
        <label className="field" style={{ marginTop: 16 }}>
          <Label text="Your result, if you have it" />
          <input
            className="input"
            name="working_genius"
            placeholder="e.g. WDGEIT, or your top two like Wonder and Discernment"
            defaultValue={v("working_genius")}
          />
        </label>
      </div>

      <label className="field">
        <Label text="Resume" />
        <input className="input" type="file" name="resume" accept=".pdf,.doc,.docx" />
        <small>PDF or Word, up to 4 MB.</small>
      </label>

      <label className="field">
        <Label text="Companies that should never see you" />
        <input className="input" name="never_show_to" placeholder="e.g. your current employer" defaultValue={v("never_show_to")} />
        <small>
          We&rsquo;ll do our best to keep you hidden from anyone at these companies, but we can&rsquo;t guarantee it, since
          someone could sign up with a personal email.
        </small>
      </label>

      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px" }}
      />

      <label className="check" style={{ marginTop: 22 }}>
        <input type="checkbox" name="consent" required />
        <span>
          <span className="req" aria-hidden="true">
            *{" "}
          </span>
          I agree to be listed anonymously, and for my name and contact details to be shared with business owners who
          sign an agreement with us.
        </span>
      </label>

      {state.error && (
        <p className="notice notice-bad" role="alert" style={{ marginTop: 18 }}>
          {state.error}
        </p>
      )}

      <button className="btn btn-gold" type="submit" disabled={pending} style={{ marginTop: 22 }}>
        {pending ? "Sending…" : "Send application"}
      </button>
    </form>
  );
}
