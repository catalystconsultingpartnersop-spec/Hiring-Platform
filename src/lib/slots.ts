import { db } from "./db";
import { nextDates, validTimeZone, zonedToUtc } from "./time";

// Open onboarding-call times, built from every active rep's weekly hours minus
// the calls they already have.

export const CALL_MINUTES = 45;
const STEP_MINUTES = 60; // a 45-minute call plus a 15-minute breather
const MIN_NOTICE_HOURS = 12;
const DAYS_AHEAD = 14;

type Rep = { id: string; time_zone: string | null };
type Window = { staff_id: string; weekday: number; start_minute: number; end_minute: number };
type Booked = { staff_id: string; starts_at: string; ends_at: string };

export type Slot = { start: string; reps: string[] };

async function load() {
  const [{ data: reps }, { data: windows }, { data: booked }] = await Promise.all([
    db().from("staff").select("id, time_zone").eq("active", true),
    db().from("staff_availability").select("staff_id, weekday, start_minute, end_minute"),
    db()
      .from("onboarding_calls")
      .select("staff_id, starts_at, ends_at")
      .eq("status", "booked")
      .gte("ends_at", new Date().toISOString()),
  ]);
  return { reps: (reps ?? []) as Rep[], windows: (windows ?? []) as Window[], booked: (booked ?? []) as Booked[] };
}

export async function openSlots(): Promise<Slot[]> {
  try {
    const { reps, windows, booked } = await load();
    const earliest = Date.now() + MIN_NOTICE_HOURS * 3600e3;
    const byStart = new Map<number, string[]>();

    for (const rep of reps) {
      const tz = validTimeZone(rep.time_zone);
      const mine = windows.filter((w) => w.staff_id === rep.id);
      if (!mine.length) continue;
      const busy = booked
        .filter((b) => b.staff_id === rep.id)
        .map((b) => [Date.parse(b.starts_at), Date.parse(b.ends_at)] as const);

      for (const day of nextDates(DAYS_AHEAD, tz)) {
        for (const w of mine.filter((x) => x.weekday === day.weekday)) {
          for (let min = w.start_minute; min + CALL_MINUTES <= w.end_minute; min += STEP_MINUTES) {
            const start = zonedToUtc(day.y, day.m, day.d, min, tz);
            const end = start + CALL_MINUTES * 60e3;
            if (start < earliest) continue;
            if (busy.some(([bs, be]) => bs < end && be > start)) continue;
            const list = byStart.get(start) ?? [];
            list.push(rep.id);
            byStart.set(start, list);
          }
        }
      }
    }
    return [...byStart.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([t, ids]) => ({ start: new Date(t).toISOString(), reps: ids }));
  } catch (e) {
    console.error("could not build open slots", e);
    return [];
  }
}

// Reps free at a given start, least busy first, so calls spread evenly.
export async function repsFreeAt(startIso: string) {
  const slots = await openSlots();
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
  return [...slot.reps].sort((a, b) => (load.get(a) ?? 0) - (load.get(b) ?? 0));
}
