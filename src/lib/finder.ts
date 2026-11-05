import { db } from "./db";
import { isCheckAccount, isOwnerEmail } from "./session";
import { refSlug } from "./shareKit";
import { getSetting, setSetting } from "./settings";

// The finder's share: on every hire, 5% of the fee goes to whoever found the
// business owner: a rep who passed the candidate to that owner, or whose share
// link the owner came through. The candidate's own rep still earns their normal
// commission. If nobody found the owner (they came in on their own), the company
// keeps the 5%, except on the partner's own candidates: the partner (Shloimy) is
// at 45% plus this 5%, so he stays at 50% unless another rep brought the owner.

export const FINDER_PCT = 5;

type StaffRow = { id: string; email: string; full_name: string | null; is_partner?: boolean | null; active?: boolean | null };
export type FinderShare = { hireId: string; staffId: string; cents: number; how: "passed" | "link" | "came_in"; paidAt: string | null };

type Paid = Record<string, { staff_id: string; cents: number; paid_at: string; how?: FinderShare["how"] }>;
const KEY = "finder_paid";

export async function finderPaid(): Promise<Paid> {
  return getSetting<Paid>(KEY, {});
}

export async function markFinderPaid(items: { hireId: string; staffId: string; cents: number; how: FinderShare["how"] }[]) {
  const cur = await finderPaid();
  const now = new Date().toISOString();
  for (const i of items) if (!cur[i.hireId]) cur[i.hireId] = { staff_id: i.staffId, cents: i.cents, paid_at: now, how: i.how };
  await setSetting(KEY, cur);
}

export async function undoFinderPaid(hireId: string) {
  const cur = await finderPaid();
  delete cur[hireId];
  await setSetting(KEY, cur);
}

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "").slice(-10);

// Works out the finder for each paid hire. One pass, few queries.
export async function finderShares(
  hires: { id: string; amount_cents: number; status: string; unlock_id: string; candidate_id: string; signed_at: string; repId: string | null; owner: { email: string; phone: string | null; referred_by?: string | null } }[],
): Promise<Map<string, FinderShare>> {
  const out = new Map<string, FinderShare>();
  const live = hires.filter((h) => h.status === "paid" || h.status === "hired");
  if (!live.length) return out;
  const [{ data: staff }, { data: pointed }, paid] = await Promise.all([
    db().from("staff").select("id, email, full_name, is_partner, active"),
    db().from("activity_log").select("actor, at, details").eq("action", "candidate_pointed").in("details->>candidate_id", [...new Set(live.map((h) => h.candidate_id))]),
    finderPaid(),
  ]);
  const people = ((staff ?? []) as StaffRow[]).filter((s) => !isCheckAccount(s.email));
  const byEmail = new Map(people.map((s) => [s.email.toLowerCase(), s]));
  const bySlug = new Map(people.filter((s) => s.active !== false).map((s) => [refSlug((s.full_name ?? s.email).split(" ")[0]), s]));
  const partner = people.find((s) => s.is_partner && s.active !== false && !isOwnerEmail(s.email)) ?? null;

  for (const h of live) {
    const done = paid[h.id];
    if (done) {
      out.set(h.id, { hireId: h.id, staffId: done.staff_id, cents: done.cents, how: done.how ?? "came_in", paidAt: done.paid_at });
      continue;
    }
    let who: StaffRow | null = null;
    let how: FinderShare["how"] = "came_in";
    // 1. A rep passed this candidate to this owner before they signed.
    const keys = [h.owner.email.toLowerCase(), digits(h.owner.phone)].filter(Boolean);
    const hit = ((pointed ?? []) as { actor: string; at: string; details: { candidate_id?: string; to_key?: string } }[])
      .filter((p) => p.details.candidate_id === h.candidate_id && keys.includes(String(p.details.to_key ?? "").toLowerCase()) && p.at <= h.signed_at)
      .sort((a, b) => a.at.localeCompare(b.at))[0];
    if (hit) {
      who = byEmail.get(hit.actor.replace(/^staff:/, "").toLowerCase()) ?? null;
      how = "passed";
    }
    // 2. The owner came in through a rep's share link.
    if (!who && h.owner.referred_by) {
      who = bySlug.get(refSlug(h.owner.referred_by)) ?? null;
      if (who) how = "link";
    }
    // 3. Nobody found them: only the partner's own candidates earn it (back to him).
    if (!who) {
      if (!partner || h.repId !== partner.id) continue;
      who = partner;
      how = "came_in";
    }
    // Heshy finding the owner himself: the company keeps it.
    if (!who || isOwnerEmail(who.email)) continue;
    out.set(h.id, { hireId: h.id, staffId: who.id, cents: Math.round((h.amount_cents * FINDER_PCT) / 100), how, paidAt: null });
  }
  return out;
}

export const HOW_LABEL: Record<FinderShare["how"], string> = {
  passed: "passed the candidate to this owner",
  link: "the owner came through their link",
  came_in: "their own candidate, and the owner came in on their own",
};
