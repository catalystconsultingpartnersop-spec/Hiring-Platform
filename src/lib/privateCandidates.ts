import { getSetting, setSetting } from "./settings";

// Candidates a rep introduced privately (Quick intro, "Also show in Browse" off).
// They stay listed, so their own link works for the owner it was sent to, but
// they don't show in Browse, on the homepage, in matches or in the sitemap.
const KEY = "private_candidates";

export async function privateIds(): Promise<Set<string>> {
  const ids = await getSetting<string[]>(KEY, []);
  return new Set(Array.isArray(ids) ? ids : []);
}

export async function setPrivate(candidateId: string, on: boolean) {
  const ids = await privateIds();
  if (on) ids.add(candidateId);
  else ids.delete(candidateId);
  await setSetting(KEY, [...ids]);
}
