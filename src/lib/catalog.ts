import { db, FeeTier, PublicCandidate, PUBLIC_CANDIDATE_COLUMNS } from "./db";

export async function getTiers(): Promise<FeeTier[]> {
  const { data, error } = await db().from("fee_tiers").select("*").order("sort");
  if (error) throw error;
  return (data ?? []) as FeeTier[];
}

export type CatalogFilters = {
  q?: string;
  role?: string;
  industry?: string;
  level?: string;
  mode?: string;
  region?: string;
};

export async function listListed(filters: CatalogFilters = {}): Promise<PublicCandidate[]> {
  let query = db()
    .from("candidates")
    .select(PUBLIC_CANDIDATE_COLUMNS)
    .eq("status", "listed")
    .order("listed_at", { ascending: false });

  if (filters.role) query = query.eq("role_category", filters.role);
  if (filters.industry) query = query.eq("industry", filters.industry);
  if (filters.level) query = query.eq("level", filters.level);
  if (filters.mode) query = query.eq("work_mode", filters.mode);
  if (filters.region) query = query.eq("location_region", filters.region);

  const { data, error } = await query;
  if (error) throw error;
  let rows = (data ?? []) as unknown as PublicCandidate[];

  // Free-text search over the public fields only.
  const q = filters.q?.trim().toLowerCase();
  if (q) {
    rows = rows.filter((c) =>
      [c.headline, c.role_category, c.industry, c.summary, c.location_region, c.working_genius, ...c.strengths, ...c.highlights]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  return rows;
}

// Distinct values for the filter menus, taken from what's actually listed.
export function filterOptions(rows: PublicCandidate[]) {
  const uniq = (vals: (string | null)[]) =>
    [...new Set(vals.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
  return {
    roles: uniq(rows.map((r) => r.role_category)),
    industries: uniq(rows.map((r) => r.industry)),
    regions: uniq(rows.map((r) => r.location_region)),
  };
}

export async function getListed(id: string): Promise<PublicCandidate | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db()
    .from("candidates")
    .select(PUBLIC_CANDIDATE_COLUMNS)
    .eq("id", id)
    .eq("status", "listed")
    .maybeSingle();
  return (data as unknown as PublicCandidate) ?? null;
}
