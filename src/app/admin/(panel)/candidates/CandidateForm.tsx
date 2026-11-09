"use client";

import { cleanLanguages, LANGUAGES } from "@/lib/languages";
import { UploadHelper } from "@/components/UploadHelper";
import { startTransition, useActionState, useRef, useState } from "react";
import { OwnerView } from "./OwnerView";
import { bestAtText } from "@/components/CandidateCard";
import { parseOwnerPage } from "@/lib/ownerPageShared";
import { SpeakButton } from "./SpeakButton";
import type { PublicCandidate, Candidate } from "@/lib/db";
import {
  describe,
  profileOf,
  parseResult,
  suggestedHeadline,
  TRAIT_LIST,
  type Letter,
} from "@/lib/strengths";
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
import { FormState, saveCandidate, saveRepTake } from "../../actions";
import styles from "./form.module.css";
import { WordingHelp } from "./WordingHelp";
import { AVAILABILITY } from "@/lib/availability";
import { OwnerPageFields } from "./OwnerPageFields";
import {
  findBlanks,
  tidyHeadline,
  tidyHighlight,
  tidyParagraphs,
} from "@/lib/tidyText";

// The six kinds of work, in our own words.
const LETTERS: { key: Letter; name: string }[] = TRAIT_LIST.map((t) => ({
  key: t.key,
  name: t.label,
}));

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
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveCandidate.bind(null, c?.id ?? null),
    {},
  );
  const v = <K extends keyof Candidate>(k: K) => (c?.[k] ?? "") as string;
  // Set to Listed, but waiting for them to sign their candidate agreement first.
  const signing = c as
    | (Candidate & {
        list_on_sign?: boolean;
        promise_signed_at?: string | null;
      })
    | null;
  const waitingToSign =
    !!signing &&
    signing.status === "draft" &&
    !!signing.list_on_sign &&
    !signing.promise_signed_at;

  // Contact details can be filled in from the resume.
  const [contact, setContact] = useState({
    full_name: v("full_name"),
    email: v("email"),
    phone: v("phone"),
    linkedin_url: v("linkedin_url"),
  });
  const [reading, setReading] = useState<"" | "reading" | "done" | "none">("");
  const [readNote, setReadNote] = useState("");

  const [order, setOrder] = useState<Letter[]>(
    parseResult(v("working_genius")),
  );
  const [role, setRole] = useState(v("role_category"));
  const [level, setLevel] = useState(v("level"));
  const [mode, setMode] = useState(v("work_mode"));
  const [avail, setAvail] = useState(
    (c?.application as Record<string, string> | undefined)?.available ?? "",
  );
  const [langs, setLangs] = useState<string[]>(c?.languages ?? []);
  const [otherLang, setOtherLang] = useState("");
  const [industry, setIndustry] = useState(v("industry"));
  const [alsoRoles, setAlsoRoles] = useState<string[]>(c?.also_roles ?? []);
  const [alsoIndustries, setAlsoIndustries] = useState<string[]>(
    c?.also_industries ?? [],
  );
  const [headline, setHeadline] = useState(v("headline"));
  const [summary, setSummary] = useState(v("summary"));
  const [highlights, setHighlights] = useState(c?.highlights.join("\n") ?? "");
  const [resumeName, setResumeName] = useState(c?.resume_path ? "on file" : "");
  const [repTake, setRepTake] = useState(String((c?.application as Record<string, string> | undefined)?.rep_take ?? ""));
  const [locationRegion, setLocationRegion] = useState(v("location_region"));
  const [fullProfile, setFullProfile] = useState(v("full_profile"));
  // Fields the resume filled in, shown highlighted so the rep knows what to check.
  const [fromResume, setFromResume] = useState<Set<string>>(new Set());
  // What the writing fields said before a rewrite, so the rep can put it back.
  const [undo, setUndo] = useState<Record<string, string> | null>(null);
  const [typeLabel, setTypeLabel] = useState(String((c?.application as Record<string, string> | undefined)?.type_label ?? ""));
  const [bestLine, setBestLine] = useState(String((c?.application as Record<string, string> | undefined)?.best_line ?? ""));
  const [repWord, setRepWord] = useState(String((c?.application as Record<string, string> | undefined)?.rep_word ?? ""));
  const mark = (k: string) => (fromResume.has(k) ? styles.fromResume : "");

  const code = order.join("");
  const autoType = profileOf(code).type?.name ?? "";
  const autoBest = bestAtText({ working_genius: code } as PublicCandidate) ?? "";
  const d = describe(code);
  const autoHeadline = role ? suggestedHeadline(role, code) : "";
  const roleIdeas = suggestRoles(code);
  const ideas = headlineIdeas(role, code, level);
  const highlightIdeas = [
    ...new Set([role, ...alsoRoles].flatMap((r) => HIGHLIGHT_IDEAS[r] ?? [])),
  ].slice(0, 8);
  const addLine = (line: string) =>
    setHighlights((h) => (h.trim() ? `${h.trimEnd()}\n${line}` : line));
  const addToSummary = (bit: string) =>
    setSummary((cur) => (cur.trim() ? `${cur.trimEnd()} ${bit}` : bit));
  const app = c?.application ?? {};
  const ours =
    (app as { strengths?: { letters: string; at: string; converted?: boolean } }).strengths ?? null;
  const hasApp = Object.values(app).some(Boolean);

  // What the site last wrote into each field. A field it wrote and nobody has touched
  // since can be rewritten when there's new information; anything the rep typed stays.
  const lastDraft = useRef<Record<string, string>>({});
  const [draftedWith, setDraftedWith] = useState<string | null>(null);
  const sourcesKey = `${repTake.trim()}|${code}|${resumeName}`;

  async function writeProfile(file?: File) {
    if (file && file.size > 4 * 1024 * 1024) {
      setReading("none");
      setReadNote("This file is over 4 MB, which is too big to upload. Save it as a smaller PDF and try again.");
      return;
    }
    setReading("reading");
    setReadNote("");
    setUndo(null);
    if (c?.id) saveRepTake(c.id, repTake).catch(() => null);
    const body = new FormData();
    const picked = file ?? (document.querySelector("input[name=resume]") as HTMLInputElement | null)?.files?.[0];
    if (picked) body.append("resume", picked);
    if (c?.id) body.append("candidate_id", c.id);
    body.append("letters", code);
    body.append("rep_take", repTake);
    body.append("looking_for", String((c?.application as Record<string, string> | undefined)?.looking_for ?? ""));
    try {
      const res = await fetch("/api/admin/read-resume", { method: "POST", body });
      const json = res.ok ? await res.json() : { note: `We couldn't write the profile right now (error ${res.status}). Try again in a minute.` };
      const f = (json.found ?? {}) as Partial<Record<string, string | string[]>>;
      const s = (k: string) => (typeof f[k] === "string" ? (f[k] as string) : "");
      const l = (k: string) => (Array.isArray(f[k]) ? (f[k] as string[]) : []);
      const filled = new Set<string>();
      const ld = lastDraft.current;
      // Empty, or still exactly what the site wrote last time: fine to (re)write.
      const free = (k: string, cur: string) => !cur.trim() || cur === ld[k];
      // With a first take, the rep asked for a profile built on their words: the
      // writing fields get rewritten even if filled, and "Put back" restores them.
      const writing = ["headline", "summary", "highlights", "full_profile"];
      const lead = !!repTake.trim();
      const before: Record<string, string> = { headline, summary, highlights, full_profile: fullProfile };
      const fill = (k: string, cur: string, val: string, set: (v: string) => void) => {
        if (val && (free(k, cur) || (lead && writing.includes(k) && val !== cur))) {
          if (writing.includes(k) && cur.trim() && !free(k, cur)) setUndo((u) => ({ ...(u ?? {}), [k]: before[k] }));
          set(val);
          ld[k] = val;
          filled.add(k);
        }
      };
      const fillList = (k: string, cur: string[], val: string[], set: (v: string[]) => void) => {
        if (val.length && free(k, cur.join("|"))) {
          set(val);
          ld[k] = val.join("|");
          filled.add(k);
        }
      };
      const next = { ...contact };
      for (const k of ["full_name", "email", "phone", "linkedin_url"] as const) fill(k, contact[k], s(k), (v) => (next[k] = v));
      setContact(next);
      fill("role_category", role, s("role_category"), setRole);
      fill("level", level, s("level"), setLevel);
      fill("location_region", locationRegion, s("location_region"), setLocationRegion);
      fill("industry", industry, s("industry"), setIndustry);
      fill("headline", headline, s("headline"), setHeadline);
      fill("summary", summary, s("summary"), setSummary);
      fill("highlights", highlights, l("highlights").join("\n"), setHighlights);
      fill("full_profile", fullProfile, s("full_profile"), setFullProfile);
      fillList("also_roles", alsoRoles, l("also_roles"), setAlsoRoles);
      fillList("also_industries", alsoIndustries, l("also_industries"), setAlsoIndustries);
      fillList("languages", langs, l("languages"), setLangs);
      setFromResume((cur) => new Set([...cur, ...filled]));
      setReading(filled.size ? "done" : "none");
      if (json.drafted) setDraftedWith(sourcesKey);
      const left = [
        !mode && "how they want to work",
        !(document.querySelector("[name=salary_min]") as HTMLInputElement | null)?.value && "their pay range",
        !avail && "when they can start",
        !code && "their Strengths Assessment result",
      ].filter(Boolean);
      setReadNote(
        json.note ??
          (filled.size
            ? `Done. We wrote ${filled.size} things (highlighted in gold). Check them${left.length ? `, then add ${left.join(", ")}` : ""}.`
            : "Nothing new to fill in. Anything you've typed yourself stays as it is."),
      );
    } catch {
      setReading("none");
      setReadNote("We couldn't write the profile right now. Try again in a minute.");
    }
  }

  function tap(l: Letter) {
    setOrder((cur) =>
      cur.includes(l)
        ? cur.slice(0, cur.indexOf(l))
        : cur.length < 6
          ? [...cur, l]
          : cur,
    );
  }

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        // Submitting this way keeps everything typed in place if the save is refused.
        e.preventDefault();
        const submitter = (e.nativeEvent as SubmitEvent)
          .submitter as HTMLButtonElement | null;
        const fd = new FormData(e.currentTarget, submitter);
        // Show the same tidy-up the save applies (spacing, capitals, periods).
        setHeadline(tidyHeadline(headline));
        setSummary(tidyParagraphs(summary));
        setHighlights(
          highlights.split("\n").map(tidyHighlight).filter(Boolean).join("\n"),
        );
        startTransition(() => action(fd));
      }}
    >
      <UploadHelper />
      <OwnerView
        c={{
          id: c?.id ?? "preview",
          status: "listed",
          available: avail || null,
          role_category: role || null,
          industry: industry || null,
          also_roles: alsoRoles,
          also_industries: alsoIndustries,
          level: (level || null) as PublicCandidate["level"],
          location_region: locationRegion || null,
          work_mode: (mode || null) as PublicCandidate["work_mode"],
          languages: langs,
          salary_min: null,
          salary_max: null,
          strengths: [],
          working_genius: code.length === 6 ? code : null,
          fee_override_cents: null,
          listed_at: null,
          type_label: typeLabel,
          best_line: bestLine,
          rep_word: repWord,
        }}
        typeLabel={typeLabel}
        bestLine={bestLine}
        setTypeLabel={setTypeLabel}
        setBestLine={setBestLine}
        repWord={repWord}
        setRepWord={setRepWord}
        autoType={autoType}
        autoBest={autoBest}
        headline={headline}
        summary={summary}
        highlights={highlights}
        setHeadline={setHeadline}
        setSummary={setSummary}
        setHighlights={setHighlights}
        feeLabel={tierFeeLabel}
        ownerIntro={parseOwnerPage((c?.application as Record<string, string> | undefined)?.owner_page)?.intro ?? ""}
        pending={pending}
        saved={state.ok ?? null}
        error={state.error ?? null}
      />
      <input type="hidden" name="working_genius" value={code} />
      <p className="small muted">
        Fields marked <span className="req">*</span> are needed to list someone.
        Everything else makes the profile stronger.
      </p>

      {/* 1. Resume and contact */}
      <section className={styles.step}>
        <h2>
          <span className={styles.num}>1</span> Who they are
        </h2>
        <div className="field" style={{ marginTop: 0, marginBottom: 14 }}>
          <label htmlFor="rep_take">
            <span>
              Your first take <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
            </span>
          </label>
          <small style={{ display: "block", margin: "0 0 6px" }}>
            Type or speak: who are they, and what do they want next? What you write here leads the profile. After you: their call, then
            their Strengths Assessment, then their resume. Skip it and we&rsquo;ll go from those.
          </small>
          <textarea
            id="rep_take"
            className="textarea"
            name="rep_take"
            rows={3}
            value={repTake}
            onChange={(e) => setRepTake(e.target.value)}
            onBlur={() => {
              if (c?.id) saveRepTake(c.id, repTake).catch(() => null);
            }}
            placeholder="e.g. Successful real estate agent, home for a few years, wants to get back to building something with people. Creative, helpful, gets things moving fast. Not sure which industry yet."
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
            <SpeakButton onText={(t) => setRepTake((cur) => (cur.trim() ? `${cur.trimEnd()} ${t}` : t))} />
            {(repTake.trim() || code.length >= 2 || resumeName) && (
              <button
                type="button"
                className={`btn btn-small ${draftedWith && draftedWith !== sourcesKey ? "btn-gold" : "btn-ghost"}`}
                disabled={reading === "reading"}
                onClick={() => writeProfile()}
              >
                {reading === "reading"
                  ? "Writing…"
                  : draftedWith && draftedWith !== sourcesKey
                    ? "✨ Rewrite with what's new"
                    : draftedWith
                      ? "✨ Write it again"
                      : "✨ Write the profile for me"}
              </button>
            )}
            {undo && reading !== "reading" && (
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => {
                  if (undo.headline !== undefined) setHeadline(undo.headline);
                  if (undo.summary !== undefined) setSummary(undo.summary);
                  if (undo.highlights !== undefined) setHighlights(undo.highlights);
                  if (undo.full_profile !== undefined) setFullProfile(undo.full_profile);
                  setUndo(null);
                  setReadNote("Put back. Nothing is saved until you press Save.");
                }}
              >
                ↩ Put back the old wording
              </button>
            )}
          </div>
        </div>
        <label
          className={`${styles.drop} ${reading === "reading" ? styles.dropBusy : ""}`}
        >
          <input
            type="file"
            name="resume"
            accept=".pdf,.doc,.docx,image/jpeg,image/png"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setResumeName(f?.name ?? "");
              if (f) writeProfile(f);
            }}
          />
          <strong>
            {c?.resume_path ? "Replace their resume" : "Add their resume"}
          </strong>
          <span>
            {reading === "reading"
              ? "Reading the resume and writing their profile… about 20 seconds."
              : "PDF, Word or a photo. We'll fill in everything we can: contact details, roles, location, headline, summary and highlights. You just check it."}
          </span>
        </label>
        {readNote && (
          <p
            className={`notice ${reading === "done" ? "notice-good" : ""}`}
            role="status"
            style={{ marginTop: 12 }}
          >
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
              className={`input ${mark("full_name")}`}
              name="full_name"
              required
              value={contact.full_name}
              onChange={(e) =>
                setContact({ ...contact, full_name: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>
              Email
              <Req />
            </span>
            <input
              className={`input ${mark("email")}`}
              type="email"
              name="email"
              required
              value={contact.email}
              onChange={(e) =>
                setContact({ ...contact, email: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Phone</span>
            <input
              className={`input ${mark("phone")}`}
              name="phone"
              value={contact.phone}
              onChange={(e) =>
                setContact({ ...contact, phone: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>LinkedIn</span>
            <input
              className={`input ${mark("linkedin_url")}`}
              name="linkedin_url"
              value={contact.linkedin_url}
              onChange={(e) =>
                setContact({ ...contact, linkedin_url: e.target.value })
              }
            />
          </label>
        </div>
      </section>

      {/* 2. Assessment */}
      <section className={styles.step}>
        <h2>
          <span className={styles.num}>2</span> Their Strengths Assessment
          result
          <Req />
        </h2>
        <p className="small muted">
          Fills in by itself when they take our Strengths Assessment. To change
          it, tap the six in order, strongest first. Tap one again to undo from
          there.
        </p>
        {ours && (
          <p className="small" style={{ margin: "0 0 10px" }}>
            From our Strengths Assessment,{" "}
            {new Date(ours.at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              timeZone: "America/New_York",
            })}
            {ours.converted ? " (converted from the earlier version)" : ""}:{" "}
            <b>{`${ours.letters.slice(0, 2)} ${ours.letters.slice(2, 4)} ${ours.letters.slice(4)}`}</b>
            {code !== ours.letters && (
              <>
                {" "}
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => setOrder(parseResult(ours.letters))}
                >
                  Use this
                </button>
              </>
            )}
          </p>
        )}
        {c?.assessment_path && (
          <p className="small muted" style={{ margin: "0 0 10px" }}>
            <a
              href={`/api/assessment/${c.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open the report they sent earlier
            </a>
          </p>
        )}
        <div
          className={styles.letters}
          role="group"
          aria-label="Strengths order"
        >
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
            Result:{" "}
            <strong>
              {code
                ? `${code.slice(0, 2)} ${code.slice(2, 4)} ${code.slice(4)}`.trim()
                : "not set"}
            </strong>
          </span>
          {order.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => setOrder([])}
            >
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
      {/* The rep's own words for the badge and line owners see on the card */}
        <div style={{ marginTop: 16 }}>
          <p style={{ margin: "0 0 4px", fontWeight: 700 }}>
            Badge and best-at line, in your own words <span className="muted" style={{ fontWeight: 400 }}>(optional, shown once an owner unlocks them and in the one-page summary)</span>
          </p>
          <p className="small muted" style={{ margin: "0 0 8px" }}>
            Leave blank to use the wording from their result. Whatever you write here is what owners read instead.
          </p>
          <div className="grid-2">
            <label className="field">
              <span>Badge</span>
              <input
                className="input"
                name="type_label"
                maxLength={40}
                value={typeLabel}
                onChange={(e) => setTypeLabel(e.target.value)}
                placeholder={autoType || "e.g. Kitchen leader"}
              />
            </label>
            <label className="field">
              <span>The line under it</span>
              <input
                className="input"
                name="best_line"
                maxLength={160}
                value={bestLine}
                onChange={(e) => setBestLine(e.target.value)}
                placeholder={autoBest || "e.g. Best at running a kitchen smoothly and on time."}
              />
            </label>
          </div>
        </div>
        <label className="field" style={{ marginTop: 14 }}>
          <span>
            Your word on them <span className="muted" style={{ fontWeight: 400 }}>(one line, owners see it on the card under &ldquo;[your first name] met them&rdquo;)</span>
          </span>
          <input
            className="input"
            name="rep_word"
            maxLength={160}
            value={repWord}
            onChange={(e) => setRepWord(e.target.value)}
            placeholder={(highlights.split("\n").find((h) => h.trim()) ?? "e.g. The most organized person I've met this year.").trim()}
          />
          <span className="small muted">Leave blank and the card shows their first highlight instead.</span>
        </label>
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
            className={`input ${mark("role_category")}`}
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
        <div className={styles.chipField} style={{ marginTop: 18 }}>
          <span>Can start</span>
          <input type="hidden" name="available" value={avail} />
          <div className={styles.chips}>
            {AVAILABILITY.map((a) => (
              <button
                key={a.value}
                type="button"
                className={avail === a.value ? styles.chipOn : styles.chip}
                aria-pressed={avail === a.value}
                onClick={() => setAvail(avail === a.value ? "" : a.value)}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.chipField} style={{ marginTop: 18 }}>
          <span>Languages they speak fluently</span>
          {langs.map((l) => (
            <input key={l} type="hidden" name="languages" value={l} />
          ))}
          <div className={styles.chips}>
            {[...new Set([...LANGUAGES, ...langs])].map((l) => (
              <button
                key={l}
                type="button"
                className={langs.includes(l) ? styles.chipOn : styles.chip}
                aria-pressed={langs.includes(l)}
                onClick={() =>
                  setLangs(
                    langs.includes(l)
                      ? langs.filter((x) => x !== l)
                      : [...langs, l],
                  )
                }
              >
                {l}
              </button>
            ))}
            <input
              className="input"
              value={otherLang}
              onChange={(e) => setOtherLang(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const t = cleanLanguages([otherLang]);
                  if (t.length) setLangs([...new Set([...langs, ...t])]);
                  setOtherLang("");
                }
              }}
              onBlur={() => {
                const t = cleanLanguages([otherLang]);
                if (t.length) setLangs([...new Set([...langs, ...t])]);
                setOtherLang("");
              }}
              placeholder="Another one? Type it"
              aria-label="Another language"
              style={{
                width: 190,
                minHeight: 36,
                padding: "4px 10px",
                fontSize: 14,
              }}
            />
          </div>
        </div>
        <div className="grid-2" style={{ marginTop: 18 }}>
          <label className="field">
            <span>
              Location (broad, e.g. &ldquo;Northern New Jersey&rdquo;)
            </span>
            <input
              className={`input ${mark("location_region")}`}
              name="location_region"
              value={locationRegion}
              onChange={(e) => setLocationRegion(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Main industry</span>
            <input
              className={`input ${mark("industry")}`}
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
            <input
              className="input"
              name="salary_min"
              inputMode="numeric"
              defaultValue={c?.salary_min ?? ""}
              placeholder="70000"
            />
          </label>
          <label className="field">
            <span>Salary to ($)</span>
            <input
              className="input"
              name="salary_max"
              inputMode="numeric"
              defaultValue={c?.salary_max ?? ""}
              placeholder="85000"
            />
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
          Owners see this before signing, so describe, don&rsquo;t identify: no
          names, employers, schools or exact titles.
        </p>
        <details className={styles.more}>
          <summary>Writing tips</summary>
          <ul className={styles.tips}>
            {WRITING_TIPS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </details>
        <label className="field" style={{ marginTop: 14 }}>
          <span>Headline</span>
          <input
            className={`input ${findBlanks(headline).length ? styles.hasBlank : ""} ${mark("headline")}`}
            name="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder={
              autoHeadline
                ? "Leave blank and we'll write one for you"
                : "e.g. Bookkeeper who finds the mistake everyone else missed"
            }
          />
          {headline &&
            headline ===
              (c?.application as Record<string, string> | undefined)
                ?.headline_auto && (
              <small>
                ✓ Written automatically. It updates with their page. Change it
                to use your own.
              </small>
            )}
        </label>
        {ideas.length > 0 && !headline.trim() && (
          <div className={styles.ideas}>
            <span>Ideas (tap to use, then make it yours):</span>
            {ideas.map((h) => (
              <button
                key={h}
                type="button"
                className={styles.idea}
                onClick={() => setHeadline(h)}
              >
                {h}
              </button>
            ))}
          </div>
        )}
        <label className="field">
          <span>Short summary</span>
          <textarea
            className={`textarea ${findBlanks(summary).length ? styles.hasBlank : ""} ${mark("summary")}`}
            name="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Two or three sentences: what they've done and where they shine."
          />
        </label>
        {!summary.trim() && (
          <div className={styles.ideas}>
            <button
              type="button"
              className={styles.ideaMain}
              disabled={!role && !code}
              onClick={() => {
                if (
                  summary.trim() &&
                  !window.confirm(
                    "Replace what you've written with a first draft?",
                  )
                )
                  return;
                setSummary(summaryDraft({ role, level, code }));
              }}
            >
              Write a first draft for me
            </button>
            {SUMMARY_STARTERS.map((t) => (
              <button
                key={t}
                type="button"
                className={styles.idea}
                onClick={() => addToSummary(t)}
              >
                {t.trim()}…
              </button>
            ))}
          </div>
        )}
        <label className="field">
          <span>Highlights (one per line)</span>
          <textarea
            className={`textarea ${findBlanks(highlights).length ? styles.hasBlank : ""} ${mark("highlights")}`}
            name="highlights"
            value={highlights}
            onChange={(e) => setHighlights(e.target.value)}
            placeholder={
              "Grew a territory to 40 accounts in 18 months\nComfortable on a job site and in a boardroom"
            }
          />
        </label>
        {highlightIdeas.length > 0 && !highlights.trim() && (
          <div className={styles.ideas}>
            <span>
              Ideas for{" "}
              {[role, ...alsoRoles]
                .filter(Boolean)
                .slice(0, 2)
                .join(" and ")
                .toLowerCase()}{" "}
              (tap to add, then fill in the [brackets]):
            </span>
            {highlightIdeas.map((h) => (
              <button
                key={h}
                type="button"
                className={styles.idea}
                onClick={() => addLine(h)}
              >
                + {h}
              </button>
            ))}
          </div>
        )}
        <WordingHelp
          candidateId={c?.id ?? null}
          role={role}
          value={{ headline, summary, highlights }}
          onUse={(w) => {
            if (w.headline) setHeadline(w.headline);
            if (w.summary) setSummary(w.summary);
            if (w.highlights) setHighlights(w.highlights);
          }}
        />
        <label className="field">
          <span>Full profile (shown only after a client signs)</span>
          <textarea
            className={`textarea ${mark("full_profile")}`}
            name="full_profile"
            value={fullProfile}
            onChange={(e) => setFullProfile(e.target.value)}
          />
        </label>
        <details className={styles.more}>
          <summary>
            Write your own &ldquo;Wired for&rdquo; words instead
          </summary>
          <label className="field" style={{ marginTop: 12 }}>
            <span>Wired for</span>
            <input
              className="input"
              name="strengths"
              defaultValue={c?.strengths.join(", ") ?? ""}
              placeholder={d ? d.wiredFor.join(", ") : ""}
            />
            <small>
              Leave empty to use the words from their result. Separate with
              commas.
            </small>
          </label>
        </details>
        <OwnerPageFields
          raw={
            (c?.application as Record<string, string> | undefined)?.owner_page
          }
          listed={c?.status === "listed"}
        />
      </section>

      {/* 5. Private */}
      <section className={styles.step}>
        <h2>
          <span className={styles.num}>5</span> Private notes
        </h2>
        <div className="grid-2">
          <label className="field">
            <span>Never show to these companies</span>
            <input
              className="input"
              name="never_show_to"
              defaultValue={v("never_show_to")}
              placeholder="e.g. their current employer"
            />
          </label>
          {isAdmin && (
            <label className="field">
              <span>Fee override ($)</span>
              <input
                className="input"
                name="fee_override"
                inputMode="numeric"
                defaultValue={
                  c?.fee_override_cents != null
                    ? c.fee_override_cents / 100
                    : ""
                }
                placeholder={`Default: ${tierFeeLabel}`}
              />
            </label>
          )}
        </div>
        <label className="field" style={{ marginTop: 18 }}>
          <span>Team notes</span>
          <textarea
            className="textarea"
            name="admin_notes"
            defaultValue={v("admin_notes")}
          />
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
              <select
                className="select"
                name="status"
                defaultValue={waitingToSign ? "listed" : c.status}
              >
                <option value="listed">
                  {waitingToSign
                    ? "Listed: goes live when they sign"
                    : "Listed: owners can see them"}
                </option>
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
            {waitingToSign && !state.ok && !state.error && (
              <span className="notice" role="status">
                Waiting for them to sign their candidate agreement. They go live
                the moment they do.
              </span>
            )}
          </>
        ) : (
          <>
            <button
              className="btn btn-gold"
              type="submit"
              name="status"
              value="listed"
              disabled={pending}
            >
              {pending ? "Saving…" : "List now"}
            </button>
            <button
              className="btn btn-ghost"
              type="submit"
              name="status"
              value="draft"
              disabled={pending}
            >
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
  const [open, setOpen] = useState(false);
  const ex = exclude.trim().toLowerCase();
  const all = [...new Set([...suggested, ...value, ...options])].filter(
    (o) => o.toLowerCase() !== ex,
  );
  // Keep it short: what's picked and suggested, and the full list only when asked for.
  const picked = all.filter((o) => value.includes(o) || suggested.includes(o));
  const shown = open ? all : picked.length ? picked : all.slice(0, 8);
  const toggle = (o: string) =>
    onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  const add = () => {
    const t = typed.trim();
    if (t && !value.includes(t) && t.toLowerCase() !== ex)
      onChange([...value, t]);
    setTyped("");
  };
  return (
    <div className={styles.chipField}>
      <span>{label}</span>
      <small
        className="muted"
        style={{ display: "block", margin: "2px 0 8px" }}
      >
        {hint}
        {suggested.length > 0 && suggestedNote ? ` ★ ${suggestedNote}.` : ""}
      </small>
      {value
        .filter((x) => x.toLowerCase() !== ex)
        .map((x) => (
          <input key={x} type="hidden" name={name} value={x} />
        ))}
      <div className={styles.chips}>
        {shown.map((o) => (
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
        {shown.length < all.length || open ? (
          <button
            type="button"
            className={styles.chip}
            onClick={() => setOpen(!open)}
            style={{ borderStyle: "dashed" }}
          >
            {open ? "Show fewer" : "+ More"}
          </button>
        ) : null}
      </div>
      {open && (
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
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={add}
            disabled={!typed.trim()}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
