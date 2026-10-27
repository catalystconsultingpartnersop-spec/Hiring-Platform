import { db, FeeTier, PublicCandidate, PUBLIC_CANDIDATE_COLUMNS } from "./db";
import { profileOf, TRAITS, wiredFor } from "./strengths";
import { blockedIdsFor, isBlockedFor } from "./blocklist";
import { currentOwner } from "./session";

const DEFAULT_TIERS: FeeTier[] = [
  { id: "t1", max_salary: 100000, fee_cents: 500000, sort: 1 },
  { id: "t2", max_salary: 200000, fee_cents: 1000000, sort: 2 },
  { id: "t3", max_salary: null, fee_cents: null, sort: 3 },
];

export async function getTiers(): Promise<FeeTier[]> {
  try {
    const { data, error } = await db().from("fee_tiers").select("*").order("sort");
    if (error) throw error;
    return data?.length ? (data as FeeTier[]) : DEFAULT_TIERS;
  } catch (e) {
    console.error("fee tiers unavailable, using defaults", e);
    return DEFAULT_TIERS;
  }
}

// Every listed candidate. If the database can't be reached, the catalog shows
// as empty rather than breaking.
export async function allListed(): Promise<{ rows: PublicCandidate[] }> {
  try {
    const { data, error } = await db()
      .from("candidates")
      .select(PUBLIC_CANDIDATE_COLUMNS)
      .eq("status", "listed")
      .order("listed_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as unknown as PublicCandidate[];
    // Hide candidates who asked not to be shown to this owner's company.
    const blocked = await blockedIdsFor(await currentOwner().catch(() => null));
    return { rows: blocked.size ? rows.filter((r) => !blocked.has(r.id)) : rows };
  } catch (e) {
    console.error("catalog query failed", e);
  }
  return { rows: [] };
}

// ---------- How they work best ----------

// The candidate's two main strengths (letters), from their assessment result.
export function strengthsOf(c: PublicCandidate): string[] {
  return profileOf(c.working_genius).primary;
}

// ---------- Pay ranges ----------

export const PAY_BANDS = [
  ["under-60", "Under $60k", 0, 60000],
  ["60-90", "$60k–$90k", 60000, 90000],
  ["90-130", "$90k–$130k", 90000, 130000],
  ["130-plus", "$130k and up", 130000, Infinity],
] as const;

function payBand(c: PublicCandidate) {
  const s = c.salary_max ?? c.salary_min;
  if (s == null) return null;
  return PAY_BANDS.find(([, , lo, hi]) => s >= lo && s < hi)?.[0] ?? null;
}

// ---------- Filtering ----------

export type CatalogFilters = {
  q?: string;
  role?: string;
  level?: string;
  mode?: string;
  region?: string;
  strength?: string;
  industry?: string;
  pay?: string;
  saved?: string;
  sort?: string;
};

const FILTER_KEYS = ["role", "level", "mode", "region", "strength", "pay", "industry"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

function valueOf(c: PublicCandidate, key: FilterKey): string[] {
  switch (key) {
    case "role":
      return c.role_category ? [c.role_category] : [];
    case "level":
      return c.level ? [c.level] : [];
    case "mode":
      return c.work_mode ? [c.work_mode] : [];
    case "region":
      return c.location_region ? [c.location_region] : [];
    case "strength":
      return strengthsOf(c);
    case "industry":
      return c.industry ? [c.industry] : [];
    case "pay": {
      const b = payBand(c);
      return b ? [b] : [];
    }
  }
}

function matches(c: PublicCandidate, f: CatalogFilters, skip?: FilterKey) {
  for (const k of FILTER_KEYS) {
    if (k === skip || !f[k]) continue;
    if (!valueOf(c, k).includes(f[k]!)) return false;
  }
  if (f.saved) {
    const ids = f.saved.split(",");
    if (!ids.includes(c.id)) return false;
  }
  const q = f.q?.trim().toLowerCase();
  if (q) {
    const prof = profileOf(c.working_genius);
    const hay = [
      c.headline,
      c.role_category,
      c.industry,
      c.summary,
      c.location_region,
      prof.type?.name,
      ...[...prof.primary, ...prof.secondary].map((l) => TRAITS[l].label),
      ...wiredFor(c),
      ...c.highlights,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}

export function applyFilters(rows: PublicCandidate[], f: CatalogFilters, feeOf: (c: PublicCandidate) => number | null) {
  const out = rows.filter((c) => matches(c, f));
  const fee = (c: PublicCandidate) => feeOf(c) ?? Number.MAX_SAFE_INTEGER;
  const pay = (c: PublicCandidate) => c.salary_max ?? c.salary_min ?? Number.MAX_SAFE_INTEGER;
  const levelRank: Record<string, number> = { beginner: 0, experienced: 1, senior: 2 };
  switch (f.sort) {
    case "fee":
      out.sort((a, b) => fee(a) - fee(b));
      break;
    case "pay":
      out.sort((a, b) => pay(a) - pay(b));
      break;
    case "experience":
      out.sort((a, b) => (levelRank[b.level ?? ""] ?? -1) - (levelRank[a.level ?? ""] ?? -1));
      break;
    default:
      out.sort((a, b) => (b.listed_at ?? "").localeCompare(a.listed_at ?? ""));
  }
  return out;
}

// Counts for each option in a filter group, given the other filters in force,
// the way a store shows "Experienced (5)".
export function facetCounts(rows: PublicCandidate[], f: CatalogFilters, key: FilterKey) {
  const counts = new Map<string, number>();
  for (const c of rows) {
    if (!matches(c, f, key)) continue;
    for (const v of valueOf(c, key)) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return counts;
}

export function similarTo(c: PublicCandidate, rows: PublicCandidate[], n = 4) {
  const g = new Set(strengthsOf(c));
  return rows
    .filter((r) => r.id !== c.id)
    .map((r) => ({
      r,
      score:
        (r.role_category === c.role_category ? 3 : 0) +
        (r.industry === c.industry ? 1 : 0) +
        (r.level === c.level ? 1 : 0) +
        strengthsOf(r).filter((x) => g.has(x)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.r);
}

export async function getListed(id: string): Promise<PublicCandidate | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  try {
    const { data } = await db()
      .from("candidates")
      .select(`${PUBLIC_CANDIDATE_COLUMNS}, never_show_to`)
      .eq("id", id)
      .eq("status", "listed")
      .maybeSingle();
    if (!data) return null;
    const { never_show_to, ...pub } = data as unknown as PublicCandidate & { never_show_to: string | null };
    if (never_show_to && isBlockedFor(never_show_to, await currentOwner().catch(() => null))) return null;
    return pub as PublicCandidate;
  } catch {
    return null;
  }
}

// Kept for the home page.
export async function listListed() {
  return (await allListed()).rows;
}
