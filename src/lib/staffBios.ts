import { getSetting, setSetting } from "./settings";

// Each rep's short bio for business owners: who they are and why their opinion
// matters. Kept in settings, by staff id.
export type Bio = { line: string; bio: string };
const KEY = "staff_bios";

export async function staffBios(): Promise<Record<string, Bio>> {
  const v = await getSetting<Record<string, Bio>>(KEY, {});
  return v && typeof v === "object" ? v : {};
}
export async function bioFor(staffId: string | null | undefined): Promise<Bio | null> {
  if (!staffId) return null;
  const b = (await staffBios())[staffId];
  return b && (b.line || b.bio) ? b : null;
}
export async function setBio(staffId: string, b: Bio) {
  const all = await staffBios();
  if (b.line || b.bio) all[staffId] = { line: b.line.slice(0, 90), bio: b.bio.slice(0, 600) };
  else delete all[staffId];
  await setSetting(KEY, all);
}
