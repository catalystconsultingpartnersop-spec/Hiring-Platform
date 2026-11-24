import { db } from "./db";
import { isCheckAccount, isOwnerEmail } from "./session";
import { refSlug } from "./shareKit";
import { getSetting, setSetting } from "./settings";
import { allReferrers } from "./referrers";

// How every fee is split (30 / 30 / 30 / 10):
//   30% to whoever brought the candidate (their rep)
//   30% to whoever brought the business owner (this file: the "owner share")
//   30% to Heshy
//   10% to the growth bucket (marketing and growth)
// The same person can earn both 30% shares. If nobody brought the owner (they
// came in on their own) or Heshy did, that 30% goes to Heshy. An outside
// referral partner whose link the owner came through gets 5%; the rest of that
// 30% goes to Heshy. The site guesses who brought the owner; Heshy or a manager
// can change it on Finance before it's paid out.

import { FINDER_PCT, REFERRER_PCT } from "./split";
export { CAND_PCT, FINDER_PCT, GROWTH_PCT, HESHY_PCT, REFERRER_PCT } from "./split";

type StaffRow = { id: string; email: string; full_name: string | null; active?: boolean | null };
// staffId is a rep's id, or "ref:<code>" for a referral partner (someone outside the team).
export type FinderShare = { hireId: string; staffId: string; cents: number; how: "passed" | "link" | "came_in" | "referrer" | "set"; paidAt: string | null; set?: boolean };

type Paid = Record<string, { staff_id: string; cents: number; paid_at: string; how?: FinderShare["how"] }>;
const KEY = "finder_paid";
const CREDIT = "owner_credit";

// Hand-set "who brought the owner" per hire: a rep's id, "ref:<code>", or "none".
export async function ownerCredits(): Promise<Record<string, string>> {
  return getSetting<Record<string, string>>(CREDIT, {});
}
export async function setOwnerCredit(hireId: string, who: string | null) {
  const cur = await ownerCredits();
  if (who) cur[hireId] = who;
  else delete cur[hireId];
  await setSetting(CREDIT, cur);
}

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
  const [{ data: staff }, { data: pointed }, paid, referrers, credits] = await Promise.all([
    db().from("staff").select("id, email, full_name, active"),
    db().from("activity_log").select("actor, at, details").eq("action", "candidate_pointed").in("details->>candidate_id", [...new Set(live.map((h) => h.candidate_id))]),
    finderPaid(),
    allReferrers(),
    ownerCredits(),
  ]);
  const people = ((staff ?? []) as StaffRow[]).filter((s) => !isCheckAccount(s.email));
  const byEmail = new Map(people.map((s) => [s.email.toLowerCase(), s]));
  const bySlug = new Map(people.filter((s) => s.active !== false).map((s) => [refSlug((s.full_name ?? s.email).split(" ")[0]), s]));
  const byId = new Map(people.map((s) => [s.id, s]));

  for (const h of live) {
    const done = paid[h.id];
    if (done) {
      out.set(h.id, { hireId: h.id, staffId: done.staff_id, cents: done.cents, how: done.how ?? "came_in", paidAt: done.paid_at });
      continue;
    }
    let who: StaffRow | null = null;
    let how: FinderShare["how"] = "came_in";
    // 0. Heshy or a manager set it by hand.
    const set = credits[h.id];
    if (set) {
      if (set === "none") continue;
      if (set.startsWith("ref:")) {
        if (referrers[set.slice(4)]) out.set(h.id, { hireId: h.id, staffId: set, cents: Math.round((h.amount_cents * REFERRER_PCT) / 100), how: "referrer", paidAt: null, set: true });
        continue;
      }
      const s = byId.get(set);
      if (!s || isOwnerEmail(s.email)) continue;
      out.set(h.id, { hireId: h.id, staffId: s.id, cents: Math.round((h.amount_cents * FINDER_PCT) / 100), how: "set", paidAt: null, set: true });
      continue;
    }
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
    // 2b. The owner came through a referral partner's link (not their own business).
    if (!who && h.owner.referred_by && referrers[h.owner.referred_by]) {
      const r = referrers[h.owner.referred_by];
      const self = r.email === h.owner.email.toLowerCase() || (!!digits(r.phone) && digits(r.phone) === digits(h.owner.phone));
      if (!self) out.set(h.id, { hireId: h.id, staffId: `ref:${r.code}`, cents: Math.round((h.amount_cents * REFERRER_PCT) / 100), how: "referrer", paidAt: null });
      continue;
    }
    // 3. Nobody brought them: the owner share goes to Heshy.
    if (!who) continue;
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
  referrer: "a referral partner: the owner came through their link",
  set: "set by hand on Finance",
};
