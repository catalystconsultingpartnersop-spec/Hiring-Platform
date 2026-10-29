import { db } from "./db";

// The path from "unlocked" to "hired". Each unlock (a client who signed for a
// candidate) moves through: first call -> feedback -> meeting -> feedback ->
// hire, meet again, or references. Nothing here is required: the client can
// always just pick up the phone. This only works out where things stand.

export type Meeting = {
  id: string;
  unlock_id: string;
  kind: "call" | "meeting";
  mode: "phone" | "video" | "in_person";
  place: string | null;
  slots: string[];
  minutes: number;
  note: string | null;
  time_zone: string | null;
  status: "proposed" | "booked" | "declined" | "cancelled";
  starts_at: string | null;
  owner_verdict: "yes" | "no" | null;
  candidate_verdict: "yes" | "no" | null;
  candidate_note: string | null;
  asked_feedback_at: string | null;
  nudged_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RefRequest = {
  id: string;
  unlock_id: string;
  note: string | null;
  refs: Reference[] | null;
  given_at: string | null;
  nudged_at: string | null;
  created_at: string;
};

export type Reference = { name: string; relation: string; phone: string; email: string };

export type Stage =
  | "offer_call" // client to offer times for a first call
  | "call_proposed" // candidate to pick a time
  | "call_retime" // candidate asked for other times
  | "call_booked"
  | "call_feedback" // call happened; how did it go?
  | "offer_meeting" // both want to continue; client to set up a meeting
  | "meeting_proposed"
  | "meeting_retime"
  | "meeting_booked"
  | "meeting_feedback"
  | "decide" // hire, meet again, ask for references, or not a fit
  | "refs_waiting" // candidate to send references
  | "declined" // the candidate decided not to continue
  | "passed" // the client said not a fit
  | "taken" // hired by someone else
  | "hired";

export type PathState = { stage: Stage; meeting: Meeting | null; refs: RefRequest | null; done: number };

export const MODE_LABEL: Record<Meeting["mode"], string> = { phone: "Phone call", video: "Video call", in_person: "In person" };

export function happened(m: Meeting, nowMs: number) {
  return m.status === "booked" && !!m.starts_at && Date.parse(m.starts_at) + m.minutes * 60e3 <= nowMs;
}

export async function loadPath(unlockIds: string[]) {
  if (!unlockIds.length) return { meetings: [] as Meeting[], refs: [] as RefRequest[] };
  const [{ data: meetings }, { data: refs }] = await Promise.all([
    db().from("meetings").select("*").in("unlock_id", unlockIds).order("created_at", { ascending: true }),
    db().from("reference_requests").select("*").in("unlock_id", unlockIds).order("created_at", { ascending: true }),
  ]);
  return { meetings: (meetings ?? []) as Meeting[], refs: (refs ?? []) as RefRequest[] };
}

export function pathState(
  u: { id: string; passed_at?: string | null; candidate_declined_at?: string | null },
  all: { meetings: Meeting[]; refs: RefRequest[] },
  ctx: { hireStatus?: string | null; candidateStatus: string; nowMs: number },
): PathState {
  const meetings = all.meetings.filter((m) => m.unlock_id === u.id);
  const refsAll = all.refs.filter((r) => r.unlock_id === u.id);
  const refs = refsAll.at(-1) ?? null;
  const live = meetings.filter((m) => m.status !== "cancelled");
  const m = live.at(-1) ?? null;
  const done = meetings.filter((x) => happened(x, ctx.nowMs)).length;
  const out = (stage: Stage): PathState => ({ stage, meeting: m, refs, done });

  if (ctx.hireStatus === "paid" || ctx.hireStatus === "hired") return out("hired");
  if (u.passed_at) return out("passed");
  if (u.candidate_declined_at) return out("declined");
  if (ctx.candidateStatus === "hired") return out("taken");
  if (!m) return out("offer_call");

  const k = m.kind;
  if (m.status === "proposed") return out(`${k}_proposed`);
  if (m.status === "declined") return out(`${k}_retime`);
  if (!happened(m, ctx.nowMs)) return out(`${k}_booked`);
  if (m.candidate_verdict === "no") return out("declined");
  if (m.owner_verdict !== "yes") return out(`${k}_feedback`);
  if (k === "call") return out("offer_meeting");
  if (refs && !refs.given_at && Date.parse(refs.created_at) > Date.parse(m.created_at)) return out("refs_waiting");
  return out("decide");
}

// Short labels for the team (rep dashboard, admin).
export const STAGE_TEAM_LABEL: Record<Stage, string> = {
  offer_call: "Client to offer call times",
  call_proposed: "Candidate to pick a call time",
  call_retime: "Client to offer new call times",
  call_booked: "First call booked",
  call_feedback: "Call done, waiting on feedback",
  offer_meeting: "Client to set up a meeting",
  meeting_proposed: "Candidate to pick a meeting time",
  meeting_retime: "Client to offer new meeting times",
  meeting_booked: "Meeting booked",
  meeting_feedback: "Met, waiting on feedback",
  decide: "Client deciding",
  refs_waiting: "Candidate to send references",
  declined: "Candidate passed",
  passed: "Client passed",
  taken: "Hired elsewhere",
  hired: "Hired",
};

// The five big steps, for the progress dots both sides see.
export const BIG_STEPS = ["First call", "Meeting", "Decision", "Hired"] as const;
export function bigStepIndex(s: Stage) {
  if (s.startsWith("call") || s === "offer_call") return 0;
  if (s.startsWith("meeting") || s === "offer_meeting") return 1;
  if (s === "decide" || s === "refs_waiting") return 2;
  if (s === "hired") return 4;
  return -1;
}
