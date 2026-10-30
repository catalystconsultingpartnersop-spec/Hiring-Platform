import Link from "next/link";
import type { PublicCandidate } from "@/lib/db";
import { describe, profileOf, TRAITS } from "@/lib/strengths";
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

const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
const joinAnd = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}` : xs[0] ?? "");

// "Works best as a Driver: getting people moving and finishing the job."
export function WorksBest({ c, detail = false, compact = false }: { c: PublicCandidate; detail?: boolean; compact?: boolean }) {
  const p = profileOf(c.working_genius);
  if (!p.primary.length) return null;
  const main = p.primary.map((l) => lower(TRAITS[l].label));
  const also = p.secondary.map((l) => lower(TRAITS[l].label));
  return (
    <div className={detail ? "works-best works-best-lg" : "works-best"}>
      {p.type && <span className="works-type">{p.type.name}</span>}
      <p className="works-main">
        Best at {joinAnd(main)}
        {!compact && also.length > 0 && <span className="works-also">. Also strong at {joinAnd(also)}</span>}.
      </p>
    </div>
  );
}

export function HowTheyWork({ c }: { c: PublicCandidate }) {
  const d = describe(c.working_genius);
  if (!d) return null;
  return (
    <section className="how-they-work" aria-labelledby="how-they-work">
      <h2 id="how-they-work">How they work</h2>
      <p className="htw-line">{d.line}</p>
      <ul>
        <li>{d.thrives}</li>
        {d.alsoBrings && <li>{d.alsoBrings}</li>}
      </ul>
    </section>
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
  hideFee = false,
}: {
  c: PublicCandidate;
  fee: number | null;
  href?: string;
  example?: boolean;
  hideFee?: boolean; // the candidate looking at their own card
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
        <span>
          {[[c.role_category, ...(c.also_roles ?? [])].filter(Boolean).slice(0, 2).join(" / "), c.industry && c.industry !== "Any" ? c.industry : null]
            .filter(Boolean)
            .join(" in ")}
        </span>
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
      <WorksBest c={c} compact />
      {meta.length > 0 && (
        <div className="card-meta">
          {meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      )}
      {!hideFee && (
        <div className="card-foot">
          <span className="card-fee-label">Flat fee if you hire</span>
          <strong>{fee != null ? money(fee) : "Ask"}</strong>
        </div>
      )}
      {href && <ShortlistButton id={c.id} />}
    </div>
  );
}
