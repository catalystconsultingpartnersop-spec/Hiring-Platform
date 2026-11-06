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
              <div className="owner-view-card">
                <CandidateCard c={card} fee={null} hideFee example={false} />
                <p className="small muted" style={{ margin: "8px 2px 0" }}>
                  Flat fee shown to owners: {p.feeLabel}
                </p>
              </div>
              <div className="owner-view-edit">
                <p className="small muted" style={{ margin: "0 0 10px" }}>
                  Change the words here and the card updates as you type.
                </p>
                <label className="field">
                  <span>Headline</span>
                  <input className="input" value={p.headline} onChange={(e) => p.setHeadline(e.target.value)} />
                </label>
                <label className="field">
                  <span>Short summary</span>
                  <textarea className="textarea" rows={4} value={p.summary} onChange={(e) => p.setSummary(e.target.value)} />
                </label>
                <label className="field">
                  <span>Highlights (one per line; the first shows on the card)</span>
                  <textarea className="textarea" rows={4} value={p.highlights} onChange={(e) => p.setHighlights(e.target.value)} />
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
