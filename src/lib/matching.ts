import type { PublicCandidate } from "./db";
import { profileOf, type Letter } from "./strengths";
import { LEVEL_LABEL, WORK_MODE_LABEL, salaryRange } from "./format";

// Matching a candidate to an open position, in plain terms. Every point a match earns
// comes with a short reason, so the team (and later an owner) can see why.

export type Position = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  work_mode: string | null;
  salary_min: number | null;
  salary_max: number | null;
  level: string | null;
  role_category: string | null;
  industry: string | null;
  starts: string | null;
  needs: string | null;
  description: string | null;
  source: string;
  owner_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  url: string | null;
  status: string;
  added_by: string | null;
  created_at: string;
};

export type Fit = "strong" | "good";
export type Match = { score: number; fit: Fit | null; why: string[] };

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const words = (s: string | null | undefined) => new Set(norm(s).split(" ").filter((w) => w.length > 2));
const STOP = new Set(["and", "the", "for", "with", "role", "roles", "manager", "management", "assistant", "support"]);

const STATES: Record<string, string> = { ny: "NY", nj: "NJ", ct: "CT", pa: "PA", "new york": "NY", "new jersey": "NJ", brooklyn: "NY", queens: "NY", bronx: "NY", manhattan: "NY", "staten island": "NY", monsey: "NY", lakewood: "NJ", passaic: "NJ", linden: "NJ" };
function stateOf(place: string | null | undefined) {
  const p = norm(place);
  for (const [k, v] of Object.entries(STATES)) if (new RegExp(`\\b${k}\\b`).test(p)) return v;
  return null;
}
// The first named place, e.g. "Brooklyn NY" → "brooklyn".
const placeOf = (s: string | null | undefined) => norm(s).replace(/\b(ny|nj|ct|pa|area|near|or)\b/g, "").trim().split(" ").slice(0, 2).join(" ");

// What each natural strength looks like in a job post.
const NEEDS_WORDS: Record<Letter, string[]> = {
  W: ["strategy", "strategic", "big picture", "vision", "planning"],
  I: ["creative", "ideas", "innovative", "design", "problem solving", "problem-solving", "new approaches"],
  D: ["judgment", "judgement", "quality", "analysis", "analytical", "evaluate", "decision"],
  G: ["lead", "leadership", "motivate", "sales", "rally", "drive", "energy", "persuasive"],
  E: ["support", "customer service", "helpful", "team player", "assist", "clients", "patient"],
  T: ["follow-through", "follow through", "detail", "details", "organized", "deadlines", "reliable", "finish", "execution", "accuracy"],
};
const STRENGTH_WORD: Record<Letter, string> = {
  W: "big-picture thinking",
  I: "fresh ideas",
  D: "sound judgment",
  G: "getting people moving",
  E: "supporting the team",
  T: "follow-through",
};

const LEVEL_RANK: Record<string, number> = { beginner: 0, experienced: 1, senior: 2 };

export function scoreMatch(c: PublicCandidate, p: Position): Match {
  let score = 0;
  const why: string[] = [];

  // 1. Role: the biggest part.
  const roles = [c.role_category, ...(c.also_roles ?? [])].filter(Boolean).map((r) => norm(r));
  const pRole = norm(p.role_category);
  const titleWords = [...words(p.title)].filter((w) => !STOP.has(w));
  let roleHit = true;
  if (pRole && norm(c.role_category) === pRole) {
    score += 40;
    why.push(c.role_category!);
  } else if (pRole && roles.includes(pRole)) {
    score += 30;
    why.push(`Also a fit for ${p.role_category!.toLowerCase()}`);
  } else {
    const blob = words([c.role_category, ...(c.also_roles ?? []), c.headline, c.summary].join(" "));
    const hits = titleWords.filter((w) => blob.has(w));
    if (hits.length) {
      score += Math.min(25, hits.length * 12);
      why.push(`Experience with ${hits.slice(0, 2).join(" and ")}`);
    } else roleHit = false;
  }

  // 2. Location and work setting.
  const remote = p.work_mode === "remote";
  const cRemoteOnly = c.work_mode === "remote";
  if (remote) {
    score += 12;
    why.push("Remote job");
  } else if (placeOf(c.location_region) && placeOf(c.location_region) === placeOf(p.location)) {
    score += 15;
    why.push(c.location_region!);
  } else if (stateOf(c.location_region) && stateOf(c.location_region) === stateOf(p.location)) {
    score += 8;
    why.push(`Also in ${stateOf(p.location)}`);
  }
  if (!remote && cRemoteOnly && p.work_mode === "on-site") {
    score -= 12;
  } else if (p.work_mode && c.work_mode && (c.work_mode === p.work_mode || c.work_mode === "flexible")) {
    score += 4;
    if (!remote) why.push(WORK_MODE_LABEL[p.work_mode] ?? p.work_mode);
  }

  // 3. Pay.
  const cMin = c.salary_min ?? null;
  const cMax = c.salary_max ?? c.salary_min ?? null;
  const pMin = p.salary_min ?? null;
  const pMax = p.salary_max ?? p.salary_min ?? null;
  if (cMin != null && pMax != null && cMin > pMax * 1.1) {
    score -= 15;
  } else if (cMin != null && cMax != null && pMin != null && pMax != null && cMin <= pMax && cMax >= pMin) {
    score += 12;
    why.push(`${salaryRange(p.salary_min, p.salary_max)} fits`);
  }

  // 4. Level.
  if (p.level && c.level && p.level in LEVEL_RANK && c.level in LEVEL_RANK) {
    const gap = Math.abs(LEVEL_RANK[p.level] - LEVEL_RANK[c.level]);
    if (gap === 0) {
      score += 8;
      why.push(LEVEL_LABEL[c.level]);
    } else if (gap === 2) score -= 8;
  }

  // 5. Industry.
  if (p.industry && c.industry && norm(p.industry) === norm(c.industry)) {
    score += 6;
    why.push(c.industry);
  }

  // 6. Start date.
  const asap = /asap|as soon|immediate|right away|now/i.test(p.starts ?? "");
  if (c.available === "now" && (asap || !p.starts)) {
    score += 5;
    why.push("Can start now");
  }

  // 7. What the job needs vs. how they naturally work.
  const needs = norm(`${p.needs ?? ""} ${p.description ?? ""}`);
  if (needs) {
    const prof = profileOf(c.working_genius);
    const top = [...prof.primary, ...prof.secondary];
    let added = 0;
    for (const l of top) {
      if (added >= 2) break;
      if (NEEDS_WORDS[l].some((w) => needs.includes(w))) {
        score += prof.primary.includes(l) ? 7 : 4;
        why.push(`Strong at ${STRENGTH_WORD[l]}`);
        added++;
      }
    }
  }

  // No sign they fit the role itself? Then it isn't a match, however well the rest lines up.
  const fit: Fit | null = !roleHit ? null : score >= 60 ? "strong" : score >= 40 ? "good" : null;
  return { score, fit, why: [...new Set(why)].slice(0, 5) };
}

// The best candidates for a position, strongest first.
export function matchesFor<C extends PublicCandidate>(p: Position, cands: C[], n = 10) {
  return cands
    .map((c) => ({ c, m: scoreMatch(c, p) }))
    .filter((x) => x.m.fit)
    .sort((a, b) => b.m.score - a.m.score)
    .slice(0, n);
}

// The open positions a candidate fits, strongest first.
export function positionsFor(c: PublicCandidate, ps: Position[], n = 10) {
  return ps
    .map((p) => ({ p, m: scoreMatch(c, p) }))
    .filter((x) => x.m.fit)
    .sort((a, b) => b.m.score - a.m.score)
    .slice(0, n);
}

// "Similar candidates": treat the candidate being viewed as if it were a position.
export function asPosition(c: PublicCandidate): Position {
  const prof = profileOf(c.working_genius);
  return {
    id: c.id,
    title: c.role_category ?? c.headline ?? "",
    company: null,
    location: c.location_region,
    work_mode: c.work_mode,
    salary_min: c.salary_min,
    salary_max: c.salary_max,
    level: c.level,
    role_category: c.role_category,
    industry: c.industry,
    starts: c.available === "now" ? "now" : null,
    needs: prof.primary.map((l) => NEEDS_WORDS[l][0]).join(" "),
    description: null,
    source: "candidate",
    owner_id: null,
    contact_name: null,
    contact_email: null,
    url: null,
    status: "open",
    added_by: null,
    created_at: "",
  };
}

// A short "Similar: ..." line for the similar-candidates shelf.
export function similarReason(viewing: PublicCandidate, other: PublicCandidate): string | null {
  const bits: string[] = [];
  const role = (x: PublicCandidate) => [x.role_category, ...(x.also_roles ?? [])].filter(Boolean).map((r) => norm(r));
  const shared = role(other).find((r) => role(viewing).includes(r));
  if (shared) bits.push([other.role_category, ...(other.also_roles ?? [])].find((r) => norm(r) === shared)!.toLowerCase());
  const a = profileOf(viewing.working_genius).primary;
  const both = profileOf(other.working_genius).primary.filter((l) => a.includes(l));
  for (const l of both) bits.push(STRENGTH_WORD[l]);
  if (placeOf(viewing.location_region) && placeOf(viewing.location_region) === placeOf(other.location_region)) bits.push(other.location_region!.split(/[,(]/)[0].trim());
  if (viewing.level && viewing.level === other.level && bits.length < 3) bits.push(LEVEL_LABEL[other.level].toLowerCase());
  // Only say "similar" when they share the kind of work or how they work, not just a place or level.
  if (!shared && !both.length) return null;
  return `Similar: ${bits.slice(0, 3).join(", ")}`;
}
