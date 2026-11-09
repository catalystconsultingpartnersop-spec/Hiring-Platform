import { db } from "./db";

// Everything already on a client's plate with their other candidates, so when they
// offer times to one more, they can see (and avoid) what's taken.
export type Busy = { start: string; end: string; who: string; kind: "call" | "meeting"; status: "booked" | "offered" };

export async function ownerSchedule(ownerId: string, exceptUnlockId?: string): Promise<Busy[]> {
  const { data: unlocks } = await db()
    .from("unlocks")
    .select("id, candidates(full_name)")
    .eq("owner_id", ownerId)
    .not("confirmed_at", "is", null)
    .is("passed_at", null);
  const rows = ((unlocks ?? []) as unknown as { id: string; candidates: { full_name: string } | null }[]).filter((u) => u.id !== exceptUnlockId);
  if (!rows.length) return [];
  const name = new Map(rows.map((u) => [u.id, (u.candidates?.full_name ?? "a candidate").split(" ")[0]]));
  const { data: ms } = await db()
    .from("meetings")
    .select("unlock_id, kind, status, starts_at, slots, minutes")
    .in("unlock_id", rows.map((u) => u.id))
    .in("status", ["booked", "proposed"]);
  const now = Date.now();
  const out: Busy[] = [];
  for (const m of (ms ?? []) as { unlock_id: string; kind: "call" | "meeting"; status: string; starts_at: string | null; slots: string[]; minutes: number }[]) {
    const times = m.status === "booked" ? (m.starts_at ? [m.starts_at] : []) : (m.slots ?? []);
    for (const t of times) {
      const end = Date.parse(t) + (m.minutes || 30) * 60e3;
      if (end < now) continue;
      out.push({ start: t, end: new Date(end).toISOString(), who: name.get(m.unlock_id) ?? "a candidate", kind: m.kind, status: m.status === "booked" ? "booked" : "offered" });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

// The booked one (if any) that a new time would run into.
export function clash(busy: Busy[], startIso: string, minutes: number) {
  const s = Date.parse(startIso);
  const e = s + minutes * 60e3;
  return busy.find((b) => b.status === "booked" && Date.parse(b.start) < e && Date.parse(b.end) > s) ?? null;
}
