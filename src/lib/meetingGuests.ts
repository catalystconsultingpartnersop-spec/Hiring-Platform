import { getSetting, setSetting } from "./settings";

// People an owner brings along to a call or meeting (a partner, a manager).
// Kept in settings so no new table is needed: { [meetingId]: Guest[] }.
export type Guest = { name: string; email: string; at: string };
const KEY = "meeting_guests";

export async function guestsFor(meetingId: string): Promise<Guest[]> {
  const all = await getSetting<Record<string, Guest[]>>(KEY, {});
  return all[meetingId] ?? [];
}

export async function addGuest(meetingId: string, g: Omit<Guest, "at">) {
  const all = await getSetting<Record<string, Guest[]>>(KEY, {});
  const list = (all[meetingId] ?? []).filter((x) => x.email.toLowerCase() !== g.email.toLowerCase());
  list.push({ ...g, at: new Date().toISOString() });
  all[meetingId] = list.slice(-6);
  await setSetting(KEY, all);
}
