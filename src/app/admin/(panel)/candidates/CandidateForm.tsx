"use client";

import { useActionState } from "react";
import type { Candidate } from "@/lib/db";
import { FormState, saveCandidate } from "../../actions";
import styles from "../admin.module.css";

const ROLE_SUGGESTIONS = [
  "Sales",
  "Bookkeeping",
  "Accounting",
  "Executive assistant",
  "Office manager",
  "Customer service",
  "Operations",
  "Project management",
  "Marketing",
  "Administrative",
];

const APPLICATION_LABELS: Record<string, string> = {
  looking_for: "What kind of work they want",
  experience: "Experience",
  location: "Where they live",
  work_mode: "Work setting",
  salary: "Salary",
  about: "About them",
  working_genius: "Working Genius",
  never_show_to: "Never show to",
};

export function CandidateForm({ c, tierFeeLabel }: { c: Candidate | null; tierFeeLabel: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCandidate.bind(null, c?.id ?? null), {});
  const v = <K extends keyof Candidate>(k: K) => (c?.[k] ?? "") as string;
  const app = c?.application ?? {};
  const hasApp = Object.values(app).some(Boolean);

  return (
    <form action={action} encType="multipart/form-data">
      <div className={styles.formGrid}>
        <div>
          <fieldset className={styles.fieldset}>
            <legend>Public card</legend>
            <p className="small muted" style={{ marginBottom: 16 }}>
              Everything here is shown to anyone browsing. Describe, don&rsquo;t identify: no names, employers,
              schools or exact job titles.
            </p>
            <label className="field">
              <span>Headline</span>
              <input className="input" name="headline" defaultValue={v("headline")} placeholder="Field sales closer who thrives on job sites" />
            </label>
            <div className="grid-2" style={{ marginTop: 18 }}>
              <label className="field">
                <span>Role</span>
                <input className="input" name="role_category" list="roles" defaultValue={v("role_category")} />
                <datalist id="roles">
                  {ROLE_SUGGESTIONS.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </label>
              <label className="field">
                <span>Industry</span>
                <input className="input" name="industry" defaultValue={v("industry")} placeholder="Construction" />
              </label>
              <label className="field">
                <span>Experience</span>
                <select className="select" name="level" defaultValue={v("level")}>
                  <option value="">Not set</option>
                  <option value="beginner">Beginner with potential</option>
                  <option value="experienced">Experienced</option>
                  <option value="senior">Senior</option>
                </select>
              </label>
              <label className="field">
                <span>Work setting</span>
                <select className="select" name="work_mode" defaultValue={v("work_mode")}>
                  <option value="">Not set</option>
                  <option value="on-site">On-site</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="remote">Remote</option>
                  <option value="flexible">Flexible</option>
                </select>
              </label>
              <label className="field">
                <span>Location (broad)</span>
                <input className="input" name="location_region" defaultValue={v("location_region")} placeholder="Northern New Jersey" />
              </label>
              <label className="field">
                <span>Working Genius result</span>
                <input className="input" name="working_genius" defaultValue={v("working_genius")} placeholder="e.g. GTDEIW" />
                <small>All six letters, strongest first. Owners only see it as plain-language strengths.</small>
              </label>
              <label className="field">
                <span>Salary from ($)</span>
                <input className="input" name="salary_min" inputMode="numeric" defaultValue={c?.salary_min ?? ""} />
              </label>
              <label className="field">
                <span>Salary to ($)</span>
                <input className="input" name="salary_max" inputMode="numeric" defaultValue={c?.salary_max ?? ""} />
              </label>
            </div>
            <label className="field" style={{ marginTop: 18 }}>
              <span>Wired for</span>
              <input
                className="input"
                name="strengths"
                defaultValue={c?.strengths.join(", ") ?? ""}
                placeholder="rallying people, reading a room, pushing a deal over the line"
              />
              <small>Separate with commas. These show as the highlighted words on the card.</small>
            </label>
            <label className="field">
              <span>Summary</span>
              <textarea className="textarea" name="summary" defaultValue={v("summary")} />
              <small>The teaser paragraph on the profile page.</small>
            </label>
            <label className="field">
              <span>Highlights</span>
              <textarea className="textarea" name="highlights" defaultValue={c?.highlights.join("\n") ?? ""} placeholder={"Grew a territory from 0 to 40 accounts in 18 months\nComfortable on a job site and in a boardroom"} />
              <small>One per line.</small>
            </label>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend>Private, shown after signing</legend>
            <div className="grid-2">
              <label className="field">
                <span>Full name</span>
                <input className="input" name="full_name" defaultValue={v("full_name")} required />
              </label>
              <label className="field">
                <span>Email</span>
                <input className="input" type="email" name="email" defaultValue={v("email")} required />
              </label>
              <label className="field">
                <span>Phone</span>
                <input className="input" name="phone" defaultValue={v("phone")} />
              </label>
              <label className="field">
                <span>LinkedIn</span>
                <input className="input" name="linkedin_url" defaultValue={v("linkedin_url")} />
              </label>
            </div>
            <label className="field" style={{ marginTop: 18 }}>
              <span>Full profile</span>
              <textarea className="textarea" name="full_profile" defaultValue={v("full_profile")} style={{ minHeight: 180 }} />
            </label>
            <label className="field">
              <span>Resume</span>
              <input className="input" type="file" name="resume" accept=".pdf,.doc,.docx" />
              {c?.resume_path ? (
                <small>
                  <a href={`/api/resume/${c.id}`}>Download the current resume</a>. Uploading a new file replaces it.
                </small>
              ) : (
                <small>No resume on file.</small>
              )}
            </label>
          </fieldset>
        </div>

        <div>
          <fieldset className={styles.fieldset}>
            <legend>Status and fee</legend>
            <label className="field">
              <span>Status</span>
              <select className="select" name="status" defaultValue={c?.status ?? "draft"}>
                <option value="applied">New application</option>
                <option value="draft">Draft, not shown</option>
                <option value="listed">Listed, shown in the catalog</option>
                <option value="paused">Paused, hidden</option>
                <option value="hired">Hired</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="field">
              <span>Fee override ($)</span>
              <input
                className="input"
                name="fee_override"
                inputMode="numeric"
                defaultValue={c?.fee_override_cents != null ? c.fee_override_cents / 100 : ""}
                placeholder={tierFeeLabel}
              />
              <small>Leave empty to use the fee tier: {tierFeeLabel}.</small>
            </label>
            {!c && (
              <label className="check" style={{ marginTop: 18 }}>
                <input type="checkbox" name="consent" />
                <span>The candidate agreed to be listed.</span>
              </label>
            )}
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend>Only you see this</legend>
            <label className="field">
              <span>Never show to these companies</span>
              <input className="input" name="never_show_to" defaultValue={v("never_show_to")} />
              <small>Separate with commas. Owners from these companies can&rsquo;t unlock this candidate.</small>
            </label>
            <label className="field">
              <span>Your notes</span>
              <textarea className="textarea" name="admin_notes" defaultValue={v("admin_notes")} />
            </label>
          </fieldset>

          {hasApp && (
            <fieldset className={styles.fieldset}>
              <legend>Their application</legend>
              <dl className={styles.answers}>
                {Object.entries(APPLICATION_LABELS)
                  .filter(([k]) => app[k])
                  .map(([k, label]) => (
                    <div key={k}>
                      <dt>{label}</dt>
                      <dd>{app[k]}</dd>
                    </div>
                  ))}
              </dl>
            </fieldset>
          )}
        </div>
      </div>

      <div className={styles.saveBar}>
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        {state.error && (
          <span className="notice notice-bad" role="alert">
            {state.error}
          </span>
        )}
        {state.ok && !pending && (
          <span className="notice notice-good" role="status">
            {state.ok}
          </span>
        )}
      </div>
    </form>
  );
}
