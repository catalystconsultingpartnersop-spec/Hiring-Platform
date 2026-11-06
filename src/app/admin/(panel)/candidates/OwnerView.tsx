"use client";

import { useEffect, useRef, useState } from "react";
import { CandidateCard } from "@/components/CandidateCard";
import type { PublicCandidate } from "@/lib/db";

type Props = {
  c: Omit<PublicCandidate, "headline" | "summary" | "highlights">;
  headline: string;
  summary: string;
  highlights: string;
  setHeadline: (v: string) => void;
  setSummary: (v: string) => void;
  setHighlights: (v: string) => void;
  feeLabel: string;
  ownerIntro: string; // the owner page's own opening, which replaces the summary on the profile page
  pending: boolean;
  saved: string | null;
  error: string | null;
};

// "See it as an owner": a button that stays on screen while editing a profile. It opens the
// card exactly as business owners will see it, built from what's typed right now, with
// the words owners read editable on the spot. Changes go straight into the form.
export function OwnerView(p: Props) {
  const [open, setOpen] = useState(false);
  const [salary, setSalary] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const [asked, setAsked] = useState(false);
  const [focus, setFocus] = useState<"" | "headline" | "summary" | "highlights">("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [open]);

  const form = () => ref.current?.closest("form") ?? null;
  const show = () => {
    // Salary isn't kept anywhere else on the page, so read it from the form as it is now.
    const f = form();
    const num = (n: string) => {
      const x = Number(String((f?.elements.namedItem(n) as HTMLInputElement | null)?.value ?? "").replace(/[^0-9.]/g, ""));
      return x > 0 ? x : null;
    };
    setSalary({ min: num("salary_min"), max: num("salary_max") });
    setAsked(false);
    setOpen(true);
  };
  const save = () => {
    const f = form();
    if (!f) return;
    // A new profile saves as a draft from here; an existing one keeps the status picked below.
    const draft = f.querySelector<HTMLButtonElement>('button[type=submit][value="draft"]');
    setAsked(true);
    f.requestSubmit(draft ?? undefined);
  };

  const card: PublicCandidate = {
    ...p.c,
    headline: p.headline.trim() || "Their headline goes here",
    summary: p.summary,
    highlights: p.highlights.split("\n").map((h) => h.trim()).filter(Boolean),
    salary_min: salary.min,
    salary_max: salary.max,
  };

  return (
    <div ref={ref}>
      <button type="button" className="owner-view-btn" onClick={show}>
        👁 See it as an owner
      </button>
      {open && (
        <div className="owner-view" role="dialog" aria-modal="true" aria-label="How owners see this profile" onClick={() => setOpen(false)}>
          <div className="owner-view-box" onClick={(e) => e.stopPropagation()}>
            <div className="owner-view-top">
              <strong>How owners see it</strong>
              <button type="button" className="owner-view-x" onClick={() => setOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="owner-view-grid">
              <div>
                <p className="owner-view-where">In the catalog, while owners browse</p>
                <div className="owner-view-card" data-focus={focus} data-own={card.highlights.length ? "highlights" : "summary"}>
                  <CandidateCard c={card} fee={null} hideFee example={false} />
                </div>
                <p className="small muted" style={{ margin: "8px 2px 0" }}>
                  Flat fee shown to owners: {p.feeLabel}
                </p>
                <p className="owner-view-where" style={{ marginTop: 18 }}>
                  When they open the profile
                </p>
                <div className="owner-view-page" data-focus={focus}>
                  <h3 className="ov-h">
                    <span className="ov-n">1</span>
                    {card.headline}
                  </h3>
                  {p.ownerIntro.trim() ? (
                    <p className="ov-intro-own">{p.ownerIntro.trim().split("\n")[0]}</p>
                  ) : (
                    <p className="ov-s">
                      <span className="ov-n">2</span>
                      {p.summary.trim() || "Their short summary goes here."}
                    </p>
                  )}
                  <ul className="ov-hl">
                    {(card.highlights.length ? card.highlights : ["Their highlights go here."]).map((h, i) => (
                      <li key={i}>
                        {i === 0 && <span className="ov-n">3</span>}
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="owner-view-edit">
                <p className="small muted" style={{ margin: "0 0 10px" }}>
                  The numbers show where each one appears. Change the words and the preview updates as you type.
                </p>
                <label className="field">
                  <span>
                    <span className="ov-n">1</span> Headline <span className="ov-where">· the title on the card and on the profile</span>
                  </span>
                  <input className="input" value={p.headline} onFocus={() => setFocus("headline")} onBlur={() => setFocus("")} onChange={(e) => p.setHeadline(e.target.value)} />
                </label>
                <label className="field">
                  <span>
                    <span className="ov-n">2</span> Short summary{" "}
                    <span className="ov-where">
                      {p.ownerIntro.trim()
                        ? "· shows in the catalog's quick look (their profile page opens with its own intro, set under “Their page for owners”)"
                        : `· the opening paragraph of their profile${card.highlights.length ? "" : ", and its first sentence is the gold line on the card"}`}
                    </span>
                  </span>
                  <textarea className="textarea" rows={4} value={p.summary} onFocus={() => setFocus("summary")} onBlur={() => setFocus("")} onChange={(e) => p.setSummary(e.target.value)} />
                </label>
                <label className="field">
                  <span>
                    <span className="ov-n">3</span> Highlights <span className="ov-where">· the bullet list on their profile, one per line. The first one is also the gold line on the card</span>
                  </span>
                  <textarea className="textarea" rows={4} value={p.highlights} onFocus={() => setFocus("highlights")} onBlur={() => setFocus("")} onChange={(e) => p.setHighlights(e.target.value)} />
                </label>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <button type="button" className="btn btn-gold" onClick={save} disabled={p.pending}>
                    {p.pending ? "Saving…" : "Save"}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                    Back to editing
                  </button>
                  {asked && !p.pending && p.saved && <span className="notice notice-good">Saved ✓</span>}
                  {asked && !p.pending && p.error && <span className="notice notice-bad">{p.error}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
