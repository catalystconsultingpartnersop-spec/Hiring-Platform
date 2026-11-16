import { effectiveReps } from "@/lib/reps";
import { matchableCandidates, openPositions, positionsReady, type TeamCandidate } from "@/lib/positions";
import type { Staff } from "@/lib/session";
import { hiddenMatches, pairKey } from "@/lib/matchHidden";
import { judgedMatches } from "@/lib/matchJudge";

// Everything the Matches screens need. Reps only see their own candidates; you and partners see all.
export async function loadMatches(me: Staff) {
  const ready = await positionsReady();
  const [positions, all, hidden, judged] = await Promise.all([ready ? openPositions() : Promise.resolve([]), matchableCandidates(), hiddenMatches(), judgedMatches()]);
  let candidates: TeamCandidate[] = all;
  if (!me.manager) {
    const owners = await effectiveReps(all.map((c) => ({ id: c.id, added_by: c.added_by })));
    candidates = all.filter((c) => owners.get(c.id)?.id === me.id);
  }
  // Candidates for one position, minus anyone the team marked "not a fit" for it.
  // ...and minus anyone the second look said wouldn't do well in that kind of day.
  const verdict = (positionId: string, candidateId: string) => judged[pairKey(positionId, candidateId)];
  const doubted = (positionId: string, candidateId: string) => verdict(positionId, candidateId)?.v === "no";
  const poolFor = (positionId: string) => candidates.filter((c) => !hidden[pairKey(positionId, c.id)] && !doubted(positionId, c.id));
  const doubtsFor = (positionId: string) => candidates.filter((c) => !hidden[pairKey(positionId, c.id)] && doubted(positionId, c.id)).map((c) => ({ c, j: verdict(positionId, c.id)! }));
  const removedFor = (positionId: string) => candidates.filter((c) => hidden[pairKey(positionId, c.id)]).map((c) => ({ c, ...hidden[pairKey(positionId, c.id)] }));
  const isHidden = (positionId: string, candidateId: string) => !!hidden[pairKey(positionId, candidateId)] || doubted(positionId, candidateId);
  return { ready, positions, candidates, poolFor, removedFor, isHidden, verdict, doubtsFor };
}
