import Link from "next/link";
import { availabilityTag } from "@/lib/availability";
import type { PublicCandidate } from "@/lib/db";
import { describe, profileOf, TRAITS } from "@/lib/strengths";
import { isAnyIndustry, LEVEL_LABEL, WORK_MODE_LABEL, money, salaryRange } from "@/lib/format";

import type { QuickData } from "./QuickLook";

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
  const ownType = (c.type_label ?? "").trim();
  const ownLine = (c.best_line ?? "").trim();
  if (!p.primary.length && !ownType && !ownLine) return null;
  // The rep's own wording, when they wrote some, takes the place of the automatic one.
  if (ownType || ownLine)
    return (
      <div className={detail ? "works-best works-best-lg" : "works-best"}>
        {(ownType || p.type) && <span className="works-type">{ownType || p.type?.name}</span>}
        {(ownLine || p.primary.length > 0) && <p className="works-main">{ownLine || bestAtText(c)}</p>}
      </div>
    );
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

// "Best at sound judgment and finishing the job." as plain text.
export function bestAtText(c: PublicCandidate) {
  const own = (c.best_line ?? "").trim();
  if (own) return own;
  const p = profileOf(c.working_genius);
  if (!p.primary.length) return null;
  return `Best at ${joinAnd(p.primary.map((l) => lower(TRAITS[l].label)))}.`;
}

export function roleLine(c: PublicCandidate) {
  return [[c.role_category, ...(c.also_roles ?? [])].filter(Boolean).slice(0, 2).join(" / "), isAnyIndustry(c.industry) ? null : c.industry]
    .filter(Boolean)
    .join(" in ");
}

export function quickData(c: PublicCandidate, fee: number | null): QuickData {
  const salary = salaryRange(c.salary_min, c.salary_max);
  const facts: [string, string | null][] = [
    ["Experience", c.level ? LEVEL_LABEL[c.level] : null],
    ["Location", c.location_region],
    ["Work setting", c.work_mode ? WORK_MODE_LABEL[c.work_mode] : null],
    ["Salary", salary],
  ];
  return {
    id: c.id,
    role: c.role_category,
    label: roleLine(c) || null,
    headline: c.headline,
    best: bestAtText(c),
    summary: c.summary,
    highlights: c.highlights ?? [],
    facts: facts.filter((x): x is [string, string] => !!x[1]),
    fee: fee != null ? money(fee) : "Ask",
  };
}

export function CandidateCard({
  c,
  fee,
  href,
  example = false,
  hideFee = false,
  store = false,
  interviewing = false,
  reason = null,
}: {
  c: PublicCandidate;
  fee: number | null;
  href?: string;
  example?: boolean;
  hideFee?: boolean; // the candidate looking at their own card
  store?: boolean; // catalog extras: quick look and compare
  interviewing?: boolean; // in an introduction with an employer right now
  reason?: string | null; // why it's shown as similar ("Similar: office management, brooklyn")
}) {
  void store;
  const salary = salaryRange(c.salary_min, c.salary_max);
  const facts = [salary, placeName(c.location_region), c.level ? LEVEL_LABEL[c.level] : null, c.hours === "part" ? "Part-time" : c.hours === "either" ? "Full or part-time" : null].filter(Boolean) as string[];
  const role = [c.role_category, ...(c.also_roles ?? [])].filter(Boolean).slice(0, 2).join(" / ") || "Candidate";
  const repName = (c.rep?.full_name ?? "").trim().split(" ")[0];
  const word = (c.rep_word ?? "").trim() || ownLine(c);
  const avail = availabilityTag(c.available);

  // An introduction, not a product listing: role, the facts owners screen on, one
  // human line, the rep's word, and whether they're free.
  return (
    <div className="card card-intro">
      <div className="ci-top">
        <span className="ci-role">{role}</span>
        {(example || interviewing || avail) && (
          <span className={`ci-avail ${(avail && !/now/i.test(avail)) || interviewing ? "ci-later" : ""}`}>
            {example ? "Example" : interviewing ? "● Interviewing now" : `● ${avail}`}
          </span>
        )}
      </div>
      {facts.length > 0 && (
        <p className="ci-facts">
          {facts.map((f, i) => (
            <span key={f} className="ci-fact">
              {f}
              {i < facts.length - 1 && <span className="ci-dot">·</span>}
            </span>
          ))}
        </p>
      )}
      {reason && <p className="card-similar">{reason}</p>}
      <h3 className="ci-line">
        {href ? (
          <Link href={href} className="card-link">
            {c.headline}
          </Link>
        ) : (
          c.headline
        )}
      </h3>
      {word && (
        <div className="ci-rep">
          <span className="ci-rep-who">{repName ? `${repName} met them` : "Our team met them"}</span>
          {c.rep_word?.trim() ? <>&ldquo;{word}&rdquo;</> : word}
        </div>
      )}
      <div className="ci-foot">
        {!hideFee && (
          <span className="ci-fee">
            <strong>{fee != null ? money(fee) : "$5,000"}</strong> flat fee, only if you hire
          </span>
        )}
        {href && <span className="ci-go" aria-hidden="true">View →</span>}
      </div>
    </div>
  );
}

// Something specific to this person, so no two cards read the same: their first
// highlight, or else the first sentence of their summary.
function ownLine(c: PublicCandidate): string | null {
  const raw = (c.highlights ?? []).find((h) => h.trim()) ?? (c.summary ?? "").split(/(?<=[.!?])\s/)[0] ?? "";
  let t = raw.replace(/\s+/g, " ").trim().replace(/^[-•*]\s*/, "");
  if (t.length < 12) return null;
  if (t.length > 120) t = `${t.slice(0, 117).replace(/\s+\S*$/, "")}…`;
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?…]$/.test(t) ? t : `${t}.`;
}

// "New jersey" → "New Jersey": tidy place names typed in lower case, leave the rest alone.
function placeName(p: string | null | undefined) {
  const t = (p ?? "").trim();
  if (!t) return null;
  return t.replace(/\b([a-z])([a-z]{2,})\b/g, (w, a: string, b: string) => (/^(and|of|the|area)$/.test(w) ? w : a.toUpperCase() + b));
}
