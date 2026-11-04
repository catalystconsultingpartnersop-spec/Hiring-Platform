import { db, logActivity } from "./db";

// Results taken before they were linked (or with the email we have on file but no link):
// put them on the candidate's profile if it's still empty. Only our current six-strength
// results can be used; earlier-version results don't map to the six.
export async function backfillStrengths(): Promise<number> {
  const since = new Date(Date.now() - 90 * 864e5).toISOString();
  const { data } = await db()
    .from("activity_log")
    .select("at, details")
    .eq("action", "assessment_taken")
    .gte("at", since)
    .order("at", { ascending: false })
    .limit(500);
  const rows = ((data ?? []) as { at: string; details: { email?: string; candidate_id?: string | null; result?: { v?: number; letters?: string } } }[]).filter(
    (r) => r.details?.result?.v === 2 && r.details.result.letters && r.details.email && !r.details.candidate_id,
  );
  let filled = 0;
  const done = new Set<string>();
  for (const r of rows) {
    const email = r.details.email!.trim().toLowerCase();
    if (done.has(email)) continue; // newest result per email only
    done.add(email);
    const { data: cs } = await db().from("candidates").select("id, working_genius, application").ilike("email", email.replace(/[%_]/g, "")).neq("status", "archived").limit(2);
    if (!cs || cs.length !== 1) continue;
    const c = cs[0] as { id: string; working_genius: string | null; application: Record<string, unknown> | null };
    const app = (c.application ?? {}) as Record<string, unknown>;
    if (app.strengths) continue;
    const letters = r.details.result!.letters!;
    await db()
      .from("candidates")
      .update({ ...(c.working_genius ? {} : { working_genius: letters }), application: { ...app, strengths: { letters, at: r.at } } })
      .eq("id", c.id);
    await logActivity("system", "strengths_linked", { candidate_id: c.id, letters, filled: !c.working_genius });
    if (!c.working_genius) filled++;
  }
  return filled;
}
