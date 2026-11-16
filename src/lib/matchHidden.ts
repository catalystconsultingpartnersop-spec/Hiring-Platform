import { getSetting, setSetting } from "./settings";

// "Not a fit": someone on the team spoke to the candidate and knows this
// position isn't for them. That pair stops showing as a match everywhere,
// for the team and for the owner. It can always be put back.
type Hidden = Record<string, { by: string; at: string }>;
const KEY = "match_hidden";
export const pairKey = (positionId: string, candidateId: string) => `${positionId}:${candidateId}`;

export async function hiddenMatches(): Promise<Hidden> {
  return getSetting<Hidden>(KEY, {});
}
export async function setMatchHidden(positionId: string, candidateId: string, hide: boolean, by: string) {
  const all = await hiddenMatches();
  if (hide) all[pairKey(positionId, candidateId)] = { by, at: new Date().toISOString() };
  else delete all[pairKey(positionId, candidateId)];
  await setSetting(KEY, all);
}
