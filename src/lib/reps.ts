import { db } from "./db";
import { isOwnerEmail } from "./session";

// Everyone a candidate can be assigned to: Heshy first, then partners, then reps.
export async function repOptions(): Promise<[string, string][]> {
  const { data } = await db().from("staff").select("*").eq("active", true);
  const rows = (data ?? []) as { id: string; email: string; full_name: string | null; is_partner?: boolean }[];
  const rank = (r: (typeof rows)[number]) => (isOwnerEmail(r.email) ? 0 : r.is_partner ? 1 : 2);
  return rows
    .sort((a, b) => rank(a) - rank(b) || (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email))
    .map((r) => [r.id, `${r.full_name || r.email}${isOwnerEmail(r.email) ? " (me)" : r.is_partner ? " (partner)" : ""}`]);
}

// Who each candidate effectively belongs to: whoever they're assigned to,
// otherwise whoever took their onboarding call.
export async function effectiveReps(cands: { id: string; added_by: string | null }[]) {
  const out = new Map<string, { id: string; viaCall: boolean }>();
  const missing = cands.filter((c) => !c.added_by).map((c) => c.id);
  for (const c of cands) if (c.added_by) out.set(c.id, { id: c.added_by, viaCall: false });
  if (missing.length) {
    const { data } = await db()
      .from("onboarding_calls")
      .select("candidate_id, staff_id, starts_at, status")
      .in("candidate_id", missing)
      .neq("status", "cancelled")
      .order("starts_at", { ascending: false });
    for (const r of data ?? []) if (!out.has(r.candidate_id) && r.staff_id) out.set(r.candidate_id, { id: r.staff_id, viaCall: true });
  }
  return out;
}
