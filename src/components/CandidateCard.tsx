import Link from "next/link";
import type { PublicCandidate } from "@/lib/db";
import { geniusesOf } from "@/lib/catalog";
import { LEVEL_LABEL, WORK_MODE_LABEL, money, salaryRange } from "@/lib/format";
import { ShortlistButton } from "./Shortlist";

export function Strengths({ items, strong = false }: { items: string[]; strong?: boolean }) {
  if (!items.length) return null;
  return (
    <>
      {items.map((s, i) => (
        <span key={s + i}>
          <span className={strong ? "hl hl-strong" : "hl"}>{s}</span>
          {i < items.length - 1 ? ", " : ""}
        </span>
      ))}
    </>
  );
}

export function GeniusTags({ c }: { c: PublicCandidate }) {
  const g = geniusesOf(c);
  if (!g.length) return null;
  return (
    <div className="genius-tags" aria-label="Working Genius">
      {g.map((x) => (
        <span key={x} className="genius-tag">
          {x}
        </span>
      ))}
    </div>
  );
}

export function isNew(c: PublicCandidate) {
  return !!c.listed_at && Date.now() - Date.parse(c.listed_at) < 7 * 864e5;
}

export function CandidateCard({
  c,
  fee,
  href,
  example = false,
}: {
  c: PublicCandidate;
  fee: number | null;
  href?: string;
  example?: boolean;
}) {
  const salary = salaryRange(c.salary_min, c.salary_max);
  const meta = [
    c.level ? LEVEL_LABEL[c.level] : null,
    c.location_region,
    c.work_mode ? WORK_MODE_LABEL[c.work_mode] : null,
    salary,
  ].filter(Boolean) as string[];

  return (
    <div className="card">
      <div className="card-top">
        <span>{[c.role_category, c.industry && c.industry !== "Any" ? c.industry : null].filter(Boolean).join(" in ")}</span>
        {example ? <span className="card-ref">Example</span> : isNew(c) ? <span className="tag tag-gold">New</span> : null}
      </div>
      <h3>
        {href ? (
          <Link href={href} className="card-link">
            {c.headline}
          </Link>
        ) : (
          c.headline
        )}
      </h3>
      {c.strengths.length > 0 && (
        <p className="card-wired">
          <span className="lead">Wired for</span>
          <Strengths items={c.strengths} />
        </p>
      )}
      <GeniusTags c={c} />
      {meta.length > 0 && (
        <div className="card-meta">
          {meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      )}
      <div className="card-foot">
        <span className="muted">Flat fee if you hire</span>
        <strong>{fee != null ? money(fee) : "Ask"}</strong>
      </div>
      {href && <ShortlistButton id={c.id} />}
    </div>
  );
}
