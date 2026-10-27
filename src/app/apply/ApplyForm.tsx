"use client";

import { useActionState } from "react";
import { ApplyState, submitApplication } from "./actions";

export function ApplyForm() {
  const [state, action, pending] = useActionState<ApplyState, FormData>(submitApplication, {});

  if (state.ok) {
    return (
      <div className="notice notice-good" role="status">
        <p>
          <strong>Application sent.</strong> We&rsquo;ll email you to set up your first coaching conversation.
        </p>
      </div>
    );
  }

  return (
    <form action={action} encType="multipart/form-data">
      <div className="grid-2">
        <label className="field">
          <span>Full name</span>
          <input className="input" name="full_name" required autoComplete="name" />
        </label>
        <label className="field">
          <span>Email</span>
          <input className="input" type="email" name="email" required autoComplete="email" />
        </label>
        <label className="field">
          <span>Phone</span>
          <input className="input" type="tel" name="phone" autoComplete="tel" />
        </label>
        <label className="field">
          <span>Where you live</span>
          <input className="input" name="location" placeholder="City and state or country" />
        </label>
      </div>

      <label className="field" style={{ marginTop: 18 }}>
        <span>What kind of work do you want?</span>
        <textarea
          className="textarea"
          name="looking_for"
          required
          placeholder="Roles you're drawn to, or just what you enjoy and what drains you. It's fine if you're not sure yet."
        />
      </label>

      <div className="grid-2" style={{ marginTop: 18 }}>
        <label className="field">
          <span>Experience</span>
          <select className="select" name="experience" defaultValue="">
            <option value="">Choose one</option>
            <option>Just starting out</option>
            <option>A few years</option>
            <option>Many years</option>
            <option>Senior or leadership</option>
          </select>
        </label>
        <label className="field">
          <span>Work setting</span>
          <select className="select" name="work_mode" defaultValue="">
            <option value="">Choose one</option>
            <option>On-site</option>
            <option>Hybrid</option>
            <option>Remote</option>
            <option>Open to anything</option>
          </select>
        </label>
        <label className="field">
          <span>Salary you&rsquo;re looking for</span>
          <input className="input" name="salary" placeholder="e.g. $70,000–$85,000" />
        </label>
        <label className="field">
          <span>LinkedIn (optional)</span>
          <input className="input" type="url" name="linkedin_url" placeholder="https://linkedin.com/in/…" />
        </label>
      </div>

      <label className="field" style={{ marginTop: 18 }}>
        <span>Tell us about yourself</span>
        <textarea
          className="textarea"
          name="about"
          placeholder="What you've done, what you're proud of, what kind of boss and team you do best with."
        />
      </label>

      <label className="field">
        <span>Working Genius result (if you&rsquo;ve taken it)</span>
        <input className="input" name="working_genius" placeholder="e.g. Wonder, Discernment" />
      </label>

      <label className="field">
        <span>Resume (optional)</span>
        <input className="input" type="file" name="resume" accept=".pdf,.doc,.docx" />
        <small>PDF or Word, up to 4 MB.</small>
      </label>

      <label className="field">
        <span>Companies that should never see you</span>
        <input className="input" name="never_show_to" placeholder="e.g. your current employer" />
        <small>We&rsquo;ll never reveal you to these companies, even if they sign up.</small>
      </label>

      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />

      <label className="check" style={{ marginTop: 22 }}>
        <input type="checkbox" name="consent" required />
        <span>
          I agree to be listed anonymously once I&rsquo;ve approved my profile, and for my name and contact details to
          be shared with business owners who sign an agreement.
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
