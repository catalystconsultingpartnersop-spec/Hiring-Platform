import { db } from "./db";
import { effectiveReps } from "./reps";
import { openSlots } from "./slots";

// Everything a manager needs to see each rep's work at a glance. No money.

export type CallRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  staff_id: string;
  meet_link?: string | null;
  candidates: { id: string; full_name: string; status: string; added_by: string | null };
};
export type CandRow = { id: string; full_name: string; status: string; created_at: string; listed_at: string | null; added_by: string | null; headline: string | null };

export type RepSummary = {
  id: string;
  name: string;
  email: string;
  partner: boolean;
  hasHours: boolean;
  openThisWeek: number;
  today: CallRow[];
  week: CallRow[];
  next: CallRow | null;
  needsMark: CallRow[];
  talkedNotListed: CandRow[];
  stages: { fresh: CandRow[]; booked: CandRow[]; drafting: CandRow[]; listed: CandRow[]; hired: CandRow[] };
  calls: CallRow[];
  candidates: CandRow[];
};

const DAY = 864e5;

export async function loadTeam(): Promise<RepSummary[]> {
  const now = Date.now();
  const [{ data: staff }, { data: wins }, { data: calls }, { data: cands }, slots] = await Promise.all([
    db().from("staff").select("*").eq("active", true),
    db().from("staff_availability").select("staff_id"),
    db()
      .from("onboarding_calls")
      .select("*, candidates(id, full_name, status, added_by)")
      .gte("starts_at", new Date(now - 30 * DAY).toISOString())
      .order("starts_at", { ascending: true }),
    db().from("candidates").select("id, full_name, status, created_at, listed_at, added_by, headline").neq("status", "archived"),
    openSlots(),
  ]);
  const callRows = (calls ?? []) as unknown as CallRow[];
  const candRows = (cands ?? []) as CandRow[];
  const owner = await effectiveReps(candRows.map((c) => ({ id: c.id, added_by: c.added_by })));
  const hours = new Set((wins ?? []).map((w) => w.staff_id as string));
  const weekEnd = now + 7 * DAY;
  const nyDay = (ms: number) => new Date(ms).toLocaleDateString("en-US", { timeZone: "America/New_York" });
  const todayNY = nyDay(now);

  return ((staff ?? []) as { id: string; full_name: string | null; email: string; is_partner?: boolean }[])
    .map((s) => {
      const mineCalls = callRows.filter((k) => k.staff_id === s.id && k.status !== "cancelled");
      const upcoming = mineCalls.filter((k) => k.status === "booked" && Date.parse(k.starts_at) >= now);
      const mineCands = candRows.filter((c) => owner.get(c.id)?.id === s.id);
      const doneCall = new Set(callRows.filter((k) => k.status === "done").map((k) => k.candidates.id));
      const bookedCall = new Set(callRows.filter((k) => k.status === "booked" && Date.parse(k.ends_at) >= now).map((k) => k.candidates.id));
      const early = (c: CandRow) => c.status === "applied" || c.status === "draft";
      return {
        id: s.id,
        name: s.full_name || s.email,
        email: s.email,
        partner: !!s.is_partner,
        hasHours: hours.has(s.id),
        openThisWeek: slots.filter((x) => x.reps.includes(s.id) && Date.parse(x.start) < weekEnd).length,
        today: upcoming.filter((k) => nyDay(Date.parse(k.starts_at)) === todayNY),
        week: upcoming.filter((k) => Date.parse(k.starts_at) < weekEnd),
        next: upcoming[0] ?? null,
        needsMark: mineCalls.filter((k) => k.status === "booked" && Date.parse(k.ends_at) < now),
        talkedNotListed: mineCands.filter((c) => early(c) && doneCall.has(c.id)),
        stages: {
          fresh: mineCands.filter((c) => early(c) && !doneCall.has(c.id) && !bookedCall.has(c.id)),
          booked: mineCands.filter((c) => early(c) && bookedCall.has(c.id) && !doneCall.has(c.id)),
          drafting: mineCands.filter((c) => early(c) && doneCall.has(c.id)),
          listed: mineCands.filter((c) => c.status === "listed" || c.status === "paused"),
          hired: mineCands.filter((c) => c.status === "hired"),
        },
        calls: mineCalls,
        candidates: mineCands,
      };
    })
    .filter((r) => r.hasHours || r.calls.length || r.candidates.length)
    .sort((a, b) => b.week.length - a.week.length || a.name.localeCompare(b.name));
}
