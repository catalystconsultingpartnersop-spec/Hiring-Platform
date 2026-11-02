"use client";

import Link from "next/link";
import { useRef } from "react";
import { RoleCover } from "./RoleCover";

export type QuickData = {
  id: string;
  role: string | null;
  label: string | null;
  headline: string | null;
  best: string | null;
  summary: string | null;
  highlights: string[];
  facts: [string, string][];
  fee: string;
};

// Peek at a candidate without leaving the catalog.
export function QuickLook({ d }: { d: QuickData }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className="quick-btn" onClick={() => ref.current?.showModal()}>
        Quick look
      </button>
      <dialog
        ref={ref}
        className="quick-dialog"
        aria-label={d.headline ?? "Candidate"}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close(); // tap outside to close
        }}
      >
        <div className="quick-inner">
          <button type="button" className="quick-close" aria-label="Close" onClick={() => ref.current?.close()}>
            ×
          </button>
          <RoleCover role={d.role} label={d.label} size="hero" />
          <div className="quick-body">
            <h2>{d.headline}</h2>
            {d.best && <p className="quick-best">{d.best}</p>}
            {d.summary && <p>{d.summary}</p>}
            {d.highlights.length > 0 && (
              <ul className="quick-highlights">
                {d.highlights.slice(0, 4).map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}
            <dl className="quick-facts">
              {d.facts.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="quick-foot">
            <span>
              <small>Flat fee if you hire</small>
              <strong>{d.fee}</strong>
            </span>
            <Link className="btn btn-gold" href={`/candidates/${d.id}`}>
              See full profile
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}
