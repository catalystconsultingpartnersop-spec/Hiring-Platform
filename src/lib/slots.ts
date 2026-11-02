import { db } from "./db";
import { getSetting } from "./settings";
import { callsInBlock } from "./blocks";
import { nextDates, validTimeZone, zonedToUtc } from "./time";

// Open onboarding-call times, built from every active rep's weekly hours minus
// the calls they already have.

export const CALL_MINUTES = 45; // the standard length
export const CALL_LENGTHS = [30, 45] as const;

// Each rep picks 30- or 45-minute calls on My hours (saved as a setting, by rep).
export async function callMinutesByRep(): Promise<Record<string, number>> {
  const v = await getSetting<Record<string, number>>("call_minutes", {});
  return v && typeof v === "object" ? v : {};
}
export function lengthFor(map: Record<string, number>, staffId: string) {
  return map[staffId] === 30 ? 30 : CALL_MINUTES;
}
const MIN_NOTICE_HOURS = 12;
const DAYS_AHEAD = 14;

type Rep = { id: string; time_zone: string | null };
type Window = { staff_id: string; weekday: number; start_minute: number; end_minute: number };
type Booked = { staff_id: string; starts_at: string; ends_at: string };

export type Slot = { start: string; reps: string[]; minutes: Record<string, number> };

async function load() {
  const [{ data: reps }, { data: windows }, { data: booked }, lengths] = await Promise.all([
    db().from("staff").select("id, time_zone").eq("active", true),
    db().from("staff_availability").select("staff_id, weekday, start_minute, end_minute"),
    db()
      .from("onboarding_calls")
      .select("staff_id, starts_at, ends_at")
      .eq("status", "booked")
      .gte("ends_at", new Date().toISOString()),
    callMinutesByRep(),
  ]);
  return { reps: (reps ?? []) as Rep[], windows: (windows ?? []) as Window[], booked: (booked ?? []) as Booked[], lengths };
}

// A candidate who came through a rep's link (or was added by them) books with
// that rep, as long as the rep has open times. Otherwise everyone's times show.
// If their rep takes calls (has hours set), they only ever see that rep's
// times, even when the rep is fully booked, so nobody else takes their candidate.
export async function openSlots(preferRep?: string | null): Promise<Slot[]> {
  const all = await allOpenSlots();
  if (!preferRep) return all;
  const mine = all.filter((s) => s.reps.includes(preferRep)).map((s) => ({ ...s, reps: [preferRep] }));
  if (mine.length) return mine;
  const { count } = await db().from("staff_availability").select("staff_id", { count: "exact", head: true }).eq("staff_id", preferRep);
  return count ? [] : all;
}

async function allOpenSlots(): Promise<Slot[]> {
  try {
    const { reps, windows, booked, lengths } = await load();
    const earliest = Date.now() + MIN_NOTICE_HOURS * 3600e3;
    const byStart = new Map<number, { reps: string[]; minutes: Record<string, number> }>();

    for (const rep of reps) {
      const tz = validTimeZone(rep.time_zone);
      const mine = windows.filter((w) => w.staff_id === rep.id);
      if (!mine.length) continue;
      const len = lengthFor(lengths, rep.id);
      const busy = booked
        .filter((b) => b.staff_id === rep.id)
        .map((b) => [Date.parse(b.starts_at), Date.parse(b.ends_at)] as const);

      for (const day of nextDates(DAYS_AHEAD, tz)) {
        for (const w of mine.filter((x) => x.weekday === day.weekday)) {
          for (const { at, minutes } of callsInBlock(w.start_minute, w.end_minute, len)) {
            const start = zonedToUtc(day.y, day.m, day.d, at, tz);
            const end = start + minutes * 60e3;
            if (start < earliest) continue;
            if (busy.some(([bs, be]) => bs < end && be > start)) continue;
            const entry = byStart.get(start) ?? { reps: [], minutes: {} };
            entry.reps.push(rep.id);
            entry.minutes[rep.id] = minutes;
            byStart.set(start, entry);
          }
        }
      }
    }
    return [...byStart.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([t, e]) => ({ start: new Date(t).toISOString(), reps: e.reps, minutes: e.minutes }));
  } catch (e) {
    console.error("could not build open slots", e);
    return [];
  }
}

// Reps free at a given start (with how long their call there is), least busy
// first, so calls spread evenly.
export async function repsFreeAt(startIso: string, preferRep?: string | null): Promise<{ id: string; minutes: number }[]> {
  const slots = await openSlots(preferRep);
  const slot = slots.find((s) => s.start === new Date(startIso).toISOString());
  if (!slot) return [];
  const { data } = await db()
    .from("onboarding_calls")
    .select("staff_id")
    .eq("status", "booked")
    .gte("starts_at", new Date().toISOString())
    .in("staff_id", slot.reps);
  const load = new Map<string, number>();
  for (const r of data ?? []) load.set(r.staff_id, (load.get(r.staff_id) ?? 0) + 1);
  return [...slot.reps]
    .sort((a, b) => (load.get(a) ?? 0) - (load.get(b) ?? 0))
    .map((id) => ({ id, minutes: slot.minutes[id] ?? CALL_MINUTES }));
}

// Is a rep free at this time by their own weekly hours (not just "no other call")?
export async function withinHours(staffId: string, startIso: string, endIso: string): Promise<boolean> {
  const [{ data: rep }, { data: wins }] = await Promise.all([
    db().from("staff").select("time_zone").eq("id", staffId).maybeSingle(),
    db().from("staff_availability").select("weekday, start_minute, end_minute").eq("staff_id", staffId),
  ]);
  const tz = validTimeZone(rep?.time_zone ?? null);
  const parts = (iso: string) => {
    const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date(iso));
    const get = (t: string) => f.find((x) => x.type === t)?.value ?? "";
    return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")), min: Number(get("hour")) * 60 + Number(get("minute")) };
  };
  const s = parts(startIso);
  const e = parts(endIso);
  const endMin = e.day === s.day ? e.min : 24 * 60;
  return ((wins ?? []) as { weekday: number; start_minute: number; end_minute: number }[]).some(
    (w) => w.weekday === s.day && w.start_minute <= s.min && w.end_minute >= endMin,
  );
}
