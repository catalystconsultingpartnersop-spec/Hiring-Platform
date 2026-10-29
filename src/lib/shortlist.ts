import { db, logActivity } from "./db";
import { sendEmail } from "./email";
import { owner as ownerMail } from "./emails";
import { refCode, siteUrl } from "./format";

// Owners who saved a candidate (and never unlocked them) hear once when that
// candidate is hired or taken off the site for good. Owners who unlocked are
// told through the agreement emails instead.
export async function tellShortlisters(candidateId: string, reason: "hired" | "removed"): Promise<string[]> {
  const told: string[] = [];
  try {
    const [{ data: rows }, { data: c }, { data: unlocks }] = await Promise.all([
      db().from("shortlists").select("owner_id, owners(email, full_name)").eq("candidate_id", candidateId).is("told_at", null),
      db().from("candidates").select("headline, role_category").eq("id", candidateId).single(),
      db().from("unlocks").select("owner_id").eq("candidate_id", candidateId),
    ]);
    if (!c || !rows?.length) return told;
    const unlocked = new Set((unlocks ?? []).map((u) => u.owner_id));
    const browse = `${siteUrl()}/candidates${c.role_category ? `?role=${encodeURIComponent(c.role_category)}` : ""}`;
    type Row = { owner_id: string; owners: { email: string; full_name: string | null } | null };
    for (const r of rows as unknown as Row[]) {
      if (!r.owners || unlocked.has(r.owner_id)) continue;
      const mail = ownerMail.savedUnavailable({
        name: r.owners.full_name,
        headline: c.headline ?? c.role_category ?? "A candidate you saved",
        ref: refCode(candidateId),
        hired: reason === "hired",
        browse,
        role: c.role_category,
      });
      const sent = await sendEmail({ to: r.owners.email, ...mail });
      if (!sent.ok) continue;
      await db().from("shortlists").update({ told_at: new Date().toISOString() }).eq("owner_id", r.owner_id).eq("candidate_id", candidateId);
      await logActivity("system", "shortlist_told_unavailable", { candidate: refCode(candidateId), owner: r.owners.email, reason });
      told.push(r.owners.email);
    }
  } catch (e) {
    console.error("tellShortlisters failed", e);
  }
  return told;
}
