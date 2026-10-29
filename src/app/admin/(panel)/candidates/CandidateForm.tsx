"use client";

import { startTransition, useActionState, useState } from "react";
import type { Candidate } from "@/lib/db";
import { describe, parseResult, suggestedHeadline, type Letter } from "@/lib/strengths";
import {
  headlineIdeas,
  HIGHLIGHT_IDEAS,
  INDUSTRY_LIST,
  ROLE_LIST,
  suggestRoles,
  SUMMARY_STARTERS,
  summaryDraft,
  WRITING_TIPS,
} from "@/lib/writingHelp";
import { FormState, saveCandidate } from "../../actions";
import styles from "./form.module.css";


// Staff-facing names for the six letters (owners never see these).
const LETTERS: { key: Letter; name: string }[] = [
  { key: "W", name: "Wonder" },
  { key: "I", name: "Invention" },
  { key: "D", name: "Discernment" },
  { key: "G", name: "Galvanizing" },
  { key: "E", name: "Enablement" },
  { key: "T", name: "Tenacity" },
];

const APPLICATION_LABELS: Record<string, string> = {
  looking_for: "What kind of work they want",
  experience: "Experience",
  location: "Where they live",
  work_mode: "Work setting",
  salary: "Salary",
  about: "About them",
  working_genius: "Assessment result they gave",
  never_show_to: "Never show to",
};

function Req() {
  return (
    <span className="req" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

export function CandidateForm({
  c,
  tierFeeLabel,
  isAdmin,
}: {
  c: Candidate | null;
  tierFeeLabel: string;
  isAdmin: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCandidate.bind(null, c?.id ?? null), {});
  const v = <K extends keyof Candidate>(k: K) => (c?.[k] ?? "") as string;

  // Contact details can be filled in from the resume.
  const [contact, setContact] = useState({
    full_name: v("full_name"),
    email: v("email"),
    phone: v("phone"),
    linkedin_url: v("linkedin_url"),
  });
  const [reading, setReading] = useState<"" | "reading" | "done" | "none">("");
  const [readNote, setReadNote] = useState("");

  const [order, setOrder] = useState<Letter[]>(parseResult(v("working_genius")));
  const [role, setRole] = useState(v("role_category"));
  const [level, setLevel] = useState(v("level"));
  const [mode, setMode] = useState(v("work_mode"));
  const [industry, setIndustry] = useState(v("industry"));
  const [alsoRoles, setAlsoRoles] = useState<string[]>(c?.also_roles ?? []);
  const [alsoIndustries, setAlsoIndustries] = useState<string[]>(c?.also_industries ?? []);
  const [headline, setHeadline] = useState(v("headline"));
  const [summary, setSummary] = useState(v("summary"));
  const [highlights, setHighlights] = useState(c?.highlights.join("\n") ?? "");

  const code = order.join("");
  const d = describe(code);
  const autoHeadline = role ? suggestedHeadline(role, code) : "";
  const roleIdeas = suggestRoles(code);
  const ideas = headlineIdeas(role, code, level);
  const highlightIdeas = [...new Set([role, ...alsoRoles].flatMap((r) => HIGHLIGHT_IDEAS[r] ?? []))].slice(0, 8);
  const addLine = (line: string) => setHighlights((h) => (h.trim() ? `${h.trimEnd()}\n${line}` : line));
  const addToSummary = (bit: string) => setSummary((cur) => (cur.trim() ? `${cur.trimEnd()} ${bit}` : bit));
  const app = c?.application ?? {};
  const hasApp = Object.values(app).some(Boolean);

  async function readResume(file: File | undefined) {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setReading("none");
      setReadNote("This file is over 4 MB, which is too big to upload. Save it as a smaller PDF and try again.");
      return;
    }
    setReading("reading");
    setReadNote("");
    const body = new FormData();
    body.append("resume", file);
    try {
      const res = await fetch("/api/admin/read-resume", { method: "POST", body });
      const json = res.ok ? await res.json() : { note: `We couldn't read this file automatically (error ${res.status}), so fill in the details by hand. It will still be attached when you save.` };
      const found = (json.found ?? {}) as Record<string, string>;
      const filled: string[] = [];
      const next = { ...contact };
      const label = { full_name: "name", email: "email", phone: "phone", linkedin_url: "LinkedIn" } as const;
      for (const k of ["full_name", "email", "phone", "linkedin_url"] as const) {
        if (!contact[k] && found[k]) {
          next[k] = found[k];
          filled.push(label[k]);
        }
      }
      setContact(next);
      setReading(filled.length ? "done" : "none");
      setReadNote(
        json.note ??
          (filled.length
            ? `Filled in their ${filled.join(", ")} from the resume. Check they're right.`
            : "Nothing new to fill in from this resume."),
      );
    } catch {
      setReading("none");
      setReadNote("We couldn't read this file automatically, so fill in the details by hand. It will still be attached when you save.");
    }
  }

  function tap(l: Letter) {
    setOrder((cur) => (cur.includes(l) ? cur.slice(0, cur.indexOf(l)) : cur.length < 6 ? [...cur, l] : cur));
  }

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        // Submitting this way keeps everything typed in place if the save is refused.
        e.preventDefault();
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const fd = new FormData(e.currentTarget, submitter);
        startTransition(() => action(fd));
      }}
    >
      <input type="hidden" name="working_genius" value={code} />
      <p className="small muted">
        Fields marked <span className="req">*</span> are needed to list someone. Everything else makes the profile
        stronger.
      </p>

      {/* 1. Resume and contact */}
      <section className={styles.step}>
        <h2>
          <span className={styles.num}>1</span> Who they are
        </h2>
        <label className={`${styles.drop} ${reading === "reading" ? styles.dropBusy : ""}`}>
          <input
            type="file"
            name="resume"
            accept=".pdf,.doc,.docx"
            onChange={(e) => readResume(e.target.files?.[0])}
          />
          <strong>{c?.resume_path ? "Replace their resume" : "Add their resume"}</strong>
          <span>
            {reading === "reading"
              ? "Reading it…"
              : "PDF or Word. We'll fill in their name, email, phone and LinkedIn for you."}
          </span>
        </label>
        {readNote && (
          <p className={`notice ${reading === "done" ? "notice-good" : ""}`} role="status" style={{ marginTop: 12 }}>
            {readNote}
          </p>
        )}
        {c?.resume_path && (
          <p className="small" style={{ marginTop: 8 }}>
            <a href={`/api/resume/${c.id}`}>Download the current resume</a>
          </p>
        )}
        <div className="grid-2" style={{ marginTop: 18 }}>
          <label className="field">
            <span>
              Full name
              <Req />
            </span>
            <input
              className="input"
              name="full_name"
              required
              value={contact.full_name}
              onChange={(e) => setContact({ ...contact, full_name: e.target.value })}
            />
          </label>
          <label className="field">
            <span>
              Email
              <Req />
            </span>
            <input
              className="input"
              type="email"
              name="email"
              required
              value={contact.email}
              onChange={(e) => setContact({ ...contact, email: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Phone</span>
            <input className="input" name="phone" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
          </label>
          <label className="field">
            <span>LinkedIn</span>
            <input
              className="input"
              name="linkedin_url"
              value={contact.linkedin_url}
              onChange={(e) => setContact({ ...contact, linkedin_url: e.target.value })}
            />
          </label>
        </div>
      </section>

      {/* 2. Assessment */}
      <section className={styles.step}>
        <h2>
          <span className={styles.num}>2</span> Their Working Genius result
          <Req />
        </h2>
        <p className="small muted">Tap the six in order, strongest first. Tap one again to undo from there.</p>
        <div className={styles.letters} role="group" aria-label="Working Genius order">
          {LETTERS.map((l) => {
            const pos = order.indexOf(l.key);
            return (
              <button
                key={l.key}
                type="button"
                className={`${styles.letter} ${pos >= 0 ? styles.letterOn : ""} ${pos >= 0 && pos < 2 ? styles.letterTop : ""}`}
                aria-pressed={pos >= 0}
                onClick={() => tap(l.key)}
              >
                <span className={styles.pos}>{pos >= 0 ? pos + 1 : ""}</span>
                <strong>{l.key}</strong>
                <span>{l.name}</span>
              </button>
            );
          })}
        </div>
        <div className={styles.codeRow}>
          <span>
            Result: <strong>{code ? `${code.slice(0, 2)} ${code.slice(2, 4)} ${code.slice(4)}`.trim() : "not set"}</strong>
          </span>
          {order.length > 0 && (
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setOrder([])}>
              Clear
            </button>
          )}
        </div>
        {d && (
          <div className={styles.preview} aria-live="polite">
            <p className={styles.previewLabel}>What owners will see</p>
            <p>
              <strong>{d.name}.</strong> {d.line}
            </p>
            <p>Wired for {d.wiredFor.join(", ")}.</p>
            <p>
              {d.thrives} {d.alsoBrings}
            </p>
            {d.bestAlongside && (
              <>
                <p className={styles.previewLabel} style={{ marginTop: 12 }}>
                  Only the team sees this
                </p>
                <p>{d.bestAlongside}</p>
              </>
            )}
          </div>
        )}
      </section>

      {/* 3. What they want */}
      <section className={styles.step}>
        <h2>
          <span className={styles.num}>3</span> What they&rsquo;re looking for
        </h2>
        <label className="field">
          <span>
            Main role
            <Req />
          </span>
          <input
            className="input"
            name="role_category"
            list="roles"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Pick or type, e.g. Sales"
          />
          <datalist id="roles">
            {ROLE_LIST.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </label>
        <ChipPicker
          name="also_roles"
          label="Also a good fit for"
          hint="Pick every kind of role they'd shine in. Owners can find them under each one."
          options={ROLE_LIST}
          suggested={roleIdeas}
          suggestedNote="Suggested from their result"
          exclude={role}
          value={alsoRoles}
          onChange={setAlsoRoles}
          addPlaceholder="Add another role"
        />
        <div className={styles.chipField}>
          <span>Experience</span>
          <input type="hidden" name="level" value={level} />
          <div className={styles.chips}>
            {[
              ["beginner", "Beginner with potential"],
              ["experienced", "Experienced"],
              ["senior", "Senior"],
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                className={level === val ? styles.chipOn : styles.chip}
                aria-pressed={level === val}
                onClick={() => setLevel(level === val ? "" : val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.chipField}>
          <span>Work setting</span>
          <input type="hidden" name="work_mode" value={mode} />
          <div className={styles.chips}>
            {[
              ["on-site", "On-site"],
              ["hybrid", "Hybrid"],
              ["remote", "Remote"],
              ["flexible", "Flexible"],
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                className={mode === val ? styles.chipOn : styles.chip}
                aria-pressed={mode === val}
                onClick={() => setMode(mode === val ? "" : val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid-2" style={{ marginTop: 18 }}>
          <label className="field">
            <span>Location (broad, e.g. &ldquo;Northern New Jersey&rdquo;)</span>
            <input className="input" name="location_region" defaultValue={v("location_region")} />
          </label>
          <label className="field">
            <span>Main industry</span>
            <input
              className="input"
              name="industry"
              list="industries"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Construction"
            />
            <datalist id="industries">
              {INDUSTRY_LIST.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </label>
          <label className="field">
            <span>Salary from ($)</span>
            <input className="input" name="salary_min" inputMode="numeric" defaultValue={c?.salary_min ?? ""} placeholder="70000" />
          </label>
          <label className="field">
            <span>Salary to ($)</span>
            <input className="input" name="salary_max" inputMode="numeric" defaultValue={c?.salary_max ?? ""} placeholder="85000" />
          </label>
        </div>
      <ChipPicker
          name="also_industries"
          label="Other industries they'd fit"
          hint="Experience or interest in more than one? Add them all."
          options={INDUSTRY_LIST}
          exclude={industry}
          value={alsoIndustries}
          onChange={setAlsoIndustries}
          addPlaceholder="Add another industry"
        />
      </section>

      {/* 4. Story */}
      <section className={styles.step}>
        <h2>
          <span className={styles.num}>4</span> Their story
        </h2>
        <p className="small muted">
          Owners see this before signing, so describe, don&rsquo;t identify: no names, employers, schools or exact titles.
        </p>
        <ul className={styles.tips}>
          {WRITING_TIPS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <label className="field" style={{ marginTop: 14 }}>
          <span>Headline</span>
          <input
            className="input"
            name="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder={autoHeadline ? `Leave blank to use: ${autoHeadline}` : "e.g. Bookkeeper who finds the mistake everyone else missed"}
          />
        </label>
        {ideas.length > 0 && (
          <div className={styles.ideas}>
            <span>Ideas (tap to use, then make it yours):</span>
            {ideas.map((h) => (
              <button key={h} type="button" className={styles.idea} onClick={() => setHeadline(h)}>
                {h}
              </button>
            ))}
          </div>
        )}
        <label className="field">
          <span>Short summary</span>
          <textarea
            className="textarea"
            name="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Two or three sentences: what they've done and where they shine."
          />
        </label>
        <div className={styles.ideas}>
          <button
            type="button"
            className={styles.ideaMain}
            disabled={!role && !code}
            onClick={() => {
              if (summary.trim() && !window.confirm("Replace what you've written with a first draft?")) return;
              setSummary(summaryDraft({ role, level, code }));
            }}
          >
            Write a first draft for me
          </button>
          {SUMMARY_STARTERS.map((t) => (
            <button key={t} type="button" className={styles.idea} onClick={() => addToSummary(t)}>
              {t.trim()}…
            </button>
          ))}
        </div>
        <label className="field">
          <span>Highlights (one per line)</span>
          <textarea
            className="textarea"
            name="highlights"
            value={highlights}
            onChange={(e) => setHighlights(e.target.value)}
            placeholder={"Grew a territory to 40 accounts in 18 months\nComfortable on a job site and in a boardroom"}
          />
        </label>
        {highlightIdeas.length > 0 && (
          <div className={styles.ideas}>
            <span>Ideas for {[role, ...alsoRoles].filter(Boolean).slice(0, 2).join(" and ").toLowerCase()} (tap to add, then fill in the [brackets]):</span>
            {highlightIdeas.map((h) => (
              <button key={h} type="button" className={styles.idea} onClick={() => addLine(h)}>
                + {h}
              </button>
            ))}
          </div>
        )}
        <label className="field">
          <span>Full profile (shown only after a client signs)</span>
          <textarea className="textarea" name="full_profile" defaultValue={v("full_profile")} />
        </label>
        <details className={styles.more}>
          <summary>Write your own &ldquo;Wired for&rdquo; words instead</summary>
          <label className="field" style={{ marginTop: 12 }}>
            <span>Wired for</span>
            <input className="input" name="strengths" defaultValue={c?.strengths.join(", ") ?? ""} placeholder={d ? d.wiredFor.join(", ") : ""} />
            <small>Leave empty to use the words from their result. Separate with commas.</small>
          </label>
        </details>
      </section>

      {/* 5. Private */}
      <section className={styles.step}>
        <h2>
          <span className={styles.num}>5</span> Private notes
        </h2>
        <div className="grid-2">
          <label className="field">
            <span>Never show to these companies</span>
            <input className="input" name="never_show_to" defaultValue={v("never_show_to")} placeholder="e.g. their current employer" />
          </label>
          {isAdmin && (
            <label className="field">
              <span>Fee override ($)</span>
              <input
                className="input"
                name="fee_override"
                inputMode="numeric"
                defaultValue={c?.fee_override_cents != null ? c.fee_override_cents / 100 : ""}
                placeholder={`Default: ${tierFeeLabel}`}
              />
            </label>
          )}
        </div>
        <label className="field" style={{ marginTop: 18 }}>
          <span>Team notes</span>
          <textarea className="textarea" name="admin_notes" defaultValue={v("admin_notes")} />
        </label>
        {!c && (
          <label className="check" style={{ marginTop: 16 }}>
            <input type="checkbox" name="consent" defaultChecked />
            <span>They agreed to be listed.</span>
          </label>
        )}
        {hasApp && (
          <details className={styles.more} open>
            <summary>What they wrote when they applied</summary>
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
          </details>
        )}
      </section>

      <div className={styles.saveBar}>
        {c ? (
          <>
            <label className={styles.statusPick}>
              <span>Status</span>
              <select className="select" name="status" defaultValue={c.status}>
                <option value="listed">Listed: owners can see them</option>
                <option value="draft">Draft: hidden</option>
                <option value="paused">Paused: hidden</option>
                <option value="applied">New application</option>
                <option value="hired">Hired</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <button className="btn btn-gold" type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-gold" type="submit" name="status" value="listed" disabled={pending}>
              {pending ? "Saving…" : "List now"}
            </button>
            <button className="btn btn-ghost" type="submit" name="status" value="draft" disabled={pending}>
              Save as draft
            </button>
          </>
        )}
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

// Pick several from a list (with suggestions first), or type your own.
function ChipPicker({
  name,
  label,
  hint,
  options,
  suggested = [],
  suggestedNote,
  exclude,
  value,
  onChange,
  addPlaceholder,
}: {
  name: string;
  label: string;
  hint: string;
  options: string[];
  suggested?: string[];
  suggestedNote?: string;
  exclude: string;
  value: string[];
  onChange: (v: string[]) => void;
  addPlaceholder: string;
}) {
  const [typed, setTyped] = useState("");
  const ex = exclude.trim().toLowerCase();
  const all = [...new Set([...suggested, ...value, ...options])].filter((o) => o.toLowerCase() !== ex);
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  const add = () => {
    const t = typed.trim();
    if (t && !value.includes(t) && t.toLowerCase() !== ex) onChange([...value, t]);
    setTyped("");
  };
  return (
    <div className={styles.chipField}>
      <span>{label}</span>
      <small className="muted" style={{ display: "block", margin: "2px 0 8px" }}>
        {hint}
        {suggested.length > 0 && suggestedNote ? ` ★ ${suggestedNote}.` : ""}
      </small>
      {value
        .filter((x) => x.toLowerCase() !== ex)
        .map((x) => (
          <input key={x} type="hidden" name={name} value={x} />
        ))}
      <div className={styles.chips}>
        {all.map((o) => (
          <button
            key={o}
            type="button"
            className={value.includes(o) ? styles.chipOn : styles.chip}
            aria-pressed={value.includes(o)}
            onClick={() => toggle(o)}
          >
            {suggested.includes(o) ? "★ " : ""}
            {o}
          </button>
        ))}
      </div>
      <div className={styles.addRow}>
        <input
          className="input"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={addPlaceholder}
        />
        <button type="button" className="btn btn-ghost btn-small" onClick={add} disabled={!typed.trim()}>
          Add
        </button>
      </div>
    </div>
  );
}
