// The site gets to know our own team on video calls by itself: a rep turns up on calls with many
// different candidates, a candidate only on their own. No pictures, nothing to set up.
import { getSetting, setSetting } from "./settings";

type Known = { name: string; seen: string[] }; // seen: the different candidates whose calls they were on (a few is enough)
type Store = { who: Record<string, Known>; scanned: string[] };
const KEY = "call_team";
const TEAM_AT = 3; // on calls with this many different candidates = one of ours
// Names a phone or browser fills in by itself say nothing about who it is.
const GENERIC = /^(someone|guest|user|unknown|no name|i?phone.*|ipad.*|galaxy.*|android.*|samsung.*|pixel.*|[+\d\s()-]+)$/i;

export type CallPerson = { user?: string; name: string };
// A person is known by their Google sign-in when they have one, and by the name they show.
export function personKeys(p: CallPerson): string[] {
  const n = p.name.trim().toLowerCase().replace(/\s+/g, " ");
  return [...(p.user ? [`u:${p.user}`] : []), ...(n && !GENERIC.test(n) ? [`n:${n}`] : [])];
}

const load = () => getSetting<Store>(KEY, { who: {}, scanned: [] });

export async function scannedCalls(): Promise<Set<string>> {
  return new Set((await load()).scanned ?? []);
}

// Remember who was on one call. Each call is only counted once.
export async function noteCall(space: string, candidateId: string, people: CallPerson[]) {
  const s = await load();
  s.who ??= {};
  s.scanned ??= [];
  if (s.scanned.includes(space)) return;
  for (const p of people) {
    for (const k of personKeys(p)) {
      const e = (s.who[k] ??= { name: p.name.trim(), seen: [] });
      if (!e.seen.includes(candidateId) && e.seen.length < TEAM_AT + 2) e.seen.push(candidateId);
    }
  }
  s.scanned = [...s.scanned, space].slice(-3000);
  await setSetting(KEY, s);
}

// Who the site has learned is ours: the keys to check people against, and their names as shown on calls.
export async function callTeam(): Promise<{ keys: Set<string>; names: string[] }> {
  const s = await load();
  const ours = Object.entries(s.who ?? {}).filter(([, e]) => e.seen.length >= TEAM_AT);
  return { keys: new Set(ours.map(([k]) => k)), names: [...new Set(ours.map(([, e]) => e.name).filter(Boolean))].sort() };
}
