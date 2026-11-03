import { effectiveReps } from "@/lib/reps";
import { matchableCandidates, openPositions, positionsReady, type TeamCandidate } from "@/lib/positions";
import type { Staff } from "@/lib/session";

// Everything the Matches screens need. Reps only see their own candidates; you and partners see all.
export async function loadMatches(me: Staff) {
  const ready = await positionsReady();
  const [positions, all] = await Promise.all([ready ? openPositions() : Promise.resolve([]), matchableCandidates()]);
  let candidates: TeamCandidate[] = all;
  if (!me.manager) {
    const owners = await effectiveReps(all.map((c) => ({ id: c.id, added_by: c.added_by })));
    candidates = all.filter((c) => owners.get(c.id)?.id === me.id);
  }
  return { ready, positions, candidates };
}
