import { hiddenStaffIds } from "./hiddenStaff";
import { isCheckAccount } from "./session";
import { db } from "./db";
import { effectiveReps } from "./reps";
import { openSlots } from "./slots";

// Everything a manager needs to see each rep's work at a glance. No money.
// Every active rep is shown, including those still setting up (no hours or agreement yet).

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
  signed: boolean; // signed their rep agreement (admins always count as signed)
  openThisWeek: number;
  today: CallRow[];
  week: CallRow[];
  next: CallRow | null;
  upcoming: CallRow[]; // booked and not over yet
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
  const hidden = await hiddenStaffIds();
  const owner = await effectiveReps(candRows.map((c) => ({ id: c.id, added_by: c.added_by })));
  const hours = new Set((wins ?? []).map((w) => w.staff_id as string));
  const weekEnd = now + 7 * DAY;
  const nyDay = (ms: number) => new Date(ms).toLocaleDateString("en-US", { timeZone: "America/New_York" });
  const todayNY = nyDay(now);

  return ((staff ?? []) as { id: string; full_name: string | null; email: string; is_partner?: boolean; role?: string; agreement_signed_at?: string | null }[])
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
        signed: s.role === "admin" || !!s.agreement_signed_at,
        openThisWeek: slots.filter((x) => x.reps.includes(s.id) && Date.parse(x.start) < weekEnd).length,
        today: upcoming.filter((k) => nyDay(Date.parse(k.starts_at)) === todayNY),
        week: upcoming.filter((k) => Date.parse(k.starts_at) < weekEnd),
        next: upcoming[0] ?? null,
        upcoming: mineCalls.filter((k) => k.status === "booked" && Date.parse(k.ends_at) >= now),
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
    .filter((r) => !isCheckAccount(r.email) && !hidden.has(r.id))
    .sort((a, b) => b.week.length - a.week.length || a.name.localeCompare(b.name));
}

export async function loadRep(id: string): Promise<RepSummary | null> {
  return (await loadTeam()).find((r) => r.id === id) ?? null;
}

// What needs attention, worded for the rep themselves ("you") or for a manager.
export type Alert = { tone: "bad" | "warn" | "ok"; text: string; href?: string };
export function alertsFor(r: RepSummary, self = false): Alert[] {
  const a: Alert[] = [];
  const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
  if (!r.signed) a.push({ tone: "bad", text: self ? "Sign your rep agreement to get started" : "Hasn't signed their rep agreement yet", href: self ? "/admin/agreement" : undefined });
  if (!r.hasHours)
    a.push({ tone: "bad", text: self ? "You have no hours set, so candidates can't book a call with you" : "No hours set, so candidates can't book them", href: self ? "/admin/hours" : undefined });
  else if (r.openThisWeek === 0)
    a.push({ tone: "bad", text: self ? "You're fully booked this week. Add hours so people can still book" : "Fully booked this week: no open times left", href: self ? "/admin/hours" : undefined });
  else if (r.openThisWeek <= 2)
    a.push({ tone: "warn", text: `Only ${n(r.openThisWeek, "open time", "open times")} left this week`, href: self ? "/admin/hours" : undefined });
  if (r.needsMark.length) a.push({ tone: "warn", text: `${n(r.needsMark.length, "past call", "past calls")} to mark Done or No-show`, href: "#mark" });
  if (r.talkedNotListed.length) a.push({ tone: "warn", text: `${n(r.talkedNotListed.length, "person", "people")} spoken to but not listed yet`, href: "#stages" });
  if (!a.length) a.push({ tone: "ok", text: "All good" });
  return a;
}
