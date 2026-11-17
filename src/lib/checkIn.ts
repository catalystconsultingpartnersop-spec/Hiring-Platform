// A candidate waiting to hear from an employer can check in: once things have been quiet for
// a couple of days, and then at most every few days. Kept in activity_log ("candidate_check_in").
import { db } from "./db";
import { Meeting, PathState, RefRequest, Stage } from "./path";

export const QUIET_DAYS = 2;
export const AGAIN_DAYS = 3;
const DAY = 864e5;

// Is the next move the employer's? And which one.
export function waitingOnThem(p: PathState): "call" | "meeting" | "word" | null {
  const s: Stage = p.stage;
  if (s === "offer_call" || s === "call_retime") return "call";
  if (s === "offer_meeting" || s === "meeting_retime") return "meeting";
  if ((s === "call_feedback" || s === "meeting_feedback" || s === "decide") && (!p.meeting || p.meeting.candidate_verdict)) return "word";
  return null;
}

export type CheckIn = { can: boolean; lastAt: string | null; againAt: string | null };

export async function lastCheckIns(unlockIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!unlockIds.length) return out;
  const { data } = await db().from("activity_log").select("at, details").eq("action", "candidate_check_in").in("details->>unlock_id", unlockIds).order("at", { ascending: false });
  for (const r of (data ?? []) as { at: string; details: { unlock_id: string } }[]) if (!out.has(r.details.unlock_id)) out.set(r.details.unlock_id, r.at);
  return out;
}

export function checkInState(o: { p: PathState; confirmedAt: string | null; meetings: Meeting[]; refs: RefRequest[]; lastAt: string | null; nowMs: number }): CheckIn {
  if (!waitingOnThem(o.p)) return { can: false, lastAt: null, againAt: null };
  // Quiet since the last thing anyone did on this introduction.
  const times = [o.confirmedAt, ...o.meetings.flatMap((m) => [m.created_at, m.updated_at, m.starts_at && Date.parse(m.starts_at) < o.nowMs ? m.starts_at : null]), ...o.refs.map((r) => r.created_at)]
    .filter(Boolean)
    .map((x) => Date.parse(x as string));
  const quietSince = Math.max(0, ...times);
  if (o.lastAt) {
    const again = Date.parse(o.lastAt) + AGAIN_DAYS * DAY;
    return { can: o.nowMs >= again, lastAt: o.lastAt, againAt: new Date(again).toISOString() };
  }
  return { can: o.nowMs - quietSince >= QUIET_DAYS * DAY, lastAt: null, againAt: null };
}
