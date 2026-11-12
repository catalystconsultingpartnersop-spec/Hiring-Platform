import { db, logActivity } from "./db";
import { escapeHtml as e, sendEmail } from "./email";
import { kit } from "./emailKit";
import { siteUrl } from "./format";
import { happened, Meeting, PathState, RefRequest, Stage } from "./path";

// The client page: what's happened with each candidate a client signed for,
// a gentle nudge the rep can send (editable, tracked), and private team notes.
// Kept in activity_log ("owner_nudge", "client_note"), no new tables.

export type NudgeKind = "meet" | "how" | "deciding" | "checkin";

export const NUDGE_LABEL: Record<NudgeKind, string> = {
  meet: "Set up a time",
  how: "How did it go?",
  deciding: "Anything to help decide?",
  checkin: "Just checking in",
};

const first = (n: string | null | undefined) => (n ?? "").split(" ")[0] || "there";

// What we'd suggest doing next, in plain words, and which nudge fits.
export function nextStep(p: PathState, cand: string): { line: string; kind: NudgeKind | null } {
  const c = first(cand);
  const when = p.meeting?.starts_at
    ? new Date(p.meeting.starts_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" })
    : "";
  const map: Partial<Record<Stage, { line: string; kind: NudgeKind | null }>> = {
    offer_call: { line: `They haven't set up a first call with ${c} yet.`, kind: "meet" },
    call_retime: { line: `${c} asked for other times. They need to offer new ones.`, kind: "meet" },
    call_proposed: { line: `${c}'s turn: picking one of the times they offered.`, kind: null },
    call_booked: { line: `First call is booked${when ? ` for ${when}` : ""}. Nothing needed.`, kind: null },
    call_feedback: { line: `They had the call. We haven't heard how it went.`, kind: "how" },
    offer_meeting: { line: `The call went well. Next is setting up a meeting with ${c}.`, kind: "meet" },
    meeting_retime: { line: `${c} asked for other meeting times.`, kind: "meet" },
    meeting_proposed: { line: `${c}'s turn: picking a meeting time.`, kind: null },
    meeting_booked: { line: `Meeting is booked${when ? ` for ${when}` : ""}. Nothing needed.`, kind: null },
    meeting_feedback: { line: `They met. We haven't heard how it went.`, kind: "how" },
    decide: { line: `They're deciding about ${c}.`, kind: "deciding" },
    refs_waiting: { line: `${c} is sending references.`, kind: null },
  };
  return map[p.stage] ?? { line: "", kind: null };
}

// The ready message for each nudge. The rep can change every word before sending.
export function nudgeText(kind: NudgeKind, o: { owner: string | null; cand: string; me: string; p: PathState | null }) {
  const c = first(o.cand);
  const hi = `Hi ${first(o.owner)},`;
  const sign = first(o.me);
  const what = o.p?.meeting?.kind === "meeting" ? "meeting" : "call";
  if (kind === "meet") {
    const next = o.p?.stage === "offer_meeting" || o.p?.stage === "meeting_retime";
    return {
      subject: next ? `Meeting ${c}` : `A first call with ${c}`,
      body: next
        ? `${hi}\n\nGlad the first call with ${c} went well. Whenever you're ready, you can offer a few times to meet on ${c}'s page, and ${c} picks one.\n\nIf it's easier, reply here and we'll help set it up.\n\n${sign}`
        : `${hi}\n\nJust checking in about ${c}. Whenever you're ready, a short first call is the easiest next step. You can offer a few times on ${c}'s page and ${c} picks one, or just give ${c} a call.\n\nIf it's easier, reply here and we'll help set it up.\n\n${sign}`,
    };
  }
  if (kind === "how")
    return {
      subject: `How did it go with ${c}?`,
      body: `${hi}\n\nHow did your ${what} with ${c} go? A quick word on ${c}'s page lets us know what's next, whether that's another conversation or someone else.\n\nOr just reply here and tell us.\n\n${sign}`,
    };
  if (kind === "deciding")
    return {
      subject: `Anything we can help with on ${c}?`,
      body: `${hi}\n\nChecking in about ${c}. If anything would help you decide, like references or another conversation, let us know and we'll set it up.\n\n${sign}`,
    };
  if (o.cand)
    return {
      subject: `Checking in about ${c}`,
      body: `${hi}\n\nJust checking in about ${c}. Is there anything we can help with?\n\n${sign}`,
    };
  return {
    subject: "Checking in",
    body: `${hi}\n\nJust checking in. Is there anything we can help with on your hiring?\n\n${sign}`,
  };
}

export async function sendNudge(o: {
  ownerId: string;
  ownerEmail: string;
  unlockId: string | null;
  candidateId: string | null;
  kind: NudgeKind;
  subject: string;
  body: string;
  by: { name: string; email: string };
}) {
  const paras = o.body
    .trim()
    .split(/\n\s*\n/)
    .map((p) => kit.p(e(p.trim()).replace(/\n/g, "<br>")))
    .join("");
  const button = o.candidateId ? kit.button(`${siteUrl()}/candidates/${o.candidateId}#next`, "Open their page") : "";
  await sendEmail({ to: o.ownerEmail, subject: o.subject, html: paras + button, audience: "owner", replyTo: o.by.email, fromName: o.by.name });
  await logActivity(`staff:${o.by.email}`, "owner_nudge", {
    owner_id: o.ownerId,
    unlock_id: o.unlockId,
    kind: o.kind,
    subject: o.subject,
    by: o.by.name,
  });
}

export type Nudge = { at: string; owner_id: string; unlock_id: string | null; kind: NudgeKind; subject: string; by: string };
export type ClientNote = { id: string; at: string; text: string; by: string };

export async function loadFollowUp(ownerId: string) {
  const [{ data: n }, { data: c }, { data: gone }] = await Promise.all([
    db().from("activity_log").select("at, details").eq("action", "owner_nudge").eq("details->>owner_id", ownerId).order("at", { ascending: false }),
    db().from("activity_log").select("id, at, details").eq("action", "client_note").eq("details->>owner_id", ownerId).order("at", { ascending: false }),
    db().from("activity_log").select("details").eq("action", "client_note_removed").eq("details->>owner_id", ownerId),
  ]);
  const removed = new Set(((gone ?? []) as { details: { note_id: string } }[]).map((g) => String(g.details.note_id)));
  const nudges = ((n ?? []) as { at: string; details: Omit<Nudge, "at"> }[]).map((r) => ({ ...r.details, at: r.at }));
  const notes = ((c ?? []) as { id: string | number; at: string; details: { text: string; by: string } }[])
    .filter((r) => !removed.has(String(r.id)))
    .map((r) => ({ id: String(r.id), at: r.at, text: r.details.text, by: r.details.by }));
  return { nudges, notes };
}

// Everything that's happened between a client and one candidate, oldest first.
export type Event = { at: string; text: string; auto?: boolean; good?: boolean; bad?: boolean };

export function timeline(
  u: { signed_at: string; passed_at?: string | null; pass_reason?: string | null; candidate_declined_at?: string | null; owner_nudged_at?: string | null },
  meetings: Meeting[],
  refs: RefRequest[],
  hires: { paid_at: string | null; status: string; refunded_at?: string | null }[],
  nudges: Nudge[],
  names: { cand: string; owner: string },
  nowMs: number,
): Event[] {
  const c = first(names.cand);
  const o = names.owner;
  const ev: Event[] = [{ at: u.signed_at, text: `Signed for ${c}` }];
  if (u.owner_nudged_at) ev.push({ at: u.owner_nudged_at, text: "Reminded to offer times", auto: true });
  for (const m of meetings) {
    const what = m.kind === "call" ? "first call" : "meeting";
    ev.push({ at: m.created_at, text: `Offered times for a ${what}` });
    if (m.status === "declined") ev.push({ at: m.updated_at, text: `${c} asked for other times` });
    if (m.status === "cancelled") ev.push({ at: m.updated_at, text: `The ${what} was cancelled`, bad: true });
    if (m.status === "booked" && m.starts_at) {
      const day = new Date(m.starts_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" });
      if (happened(m, nowMs)) ev.push({ at: m.starts_at, text: `Had the ${what}`, good: true });
      else ev.push({ at: m.updated_at, text: `${c} picked a time: ${day}`, good: true });
    }
    if (m.status === "proposed" && m.nudged_at) ev.push({ at: m.nudged_at, text: `Reminded ${c} to pick a time`, auto: true });
    if (m.asked_feedback_at) ev.push({ at: m.asked_feedback_at, text: "Asked both how it went", auto: true });
    if (happened(m, nowMs) && m.nudged_at && m.asked_feedback_at && m.nudged_at > m.asked_feedback_at)
      ev.push({ at: m.nudged_at, text: `Reminded ${o} to share how it went`, auto: true });
    if (m.owner_verdict) ev.push({ at: m.updated_at, text: m.owner_verdict === "yes" ? `${o} wants to keep going` : `${o}: not a fit`, good: m.owner_verdict === "yes", bad: m.owner_verdict === "no" });
    if (m.candidate_verdict) ev.push({ at: m.updated_at, text: m.candidate_verdict === "yes" ? `${c} wants to keep going` : `${c} decided not to continue`, good: m.candidate_verdict === "yes", bad: m.candidate_verdict === "no" });
  }
  for (const r of refs) {
    ev.push({ at: r.created_at, text: `Asked ${c} for references` });
    if (r.given_at) ev.push({ at: r.given_at, text: `${c} sent references`, good: true });
  }
  if (u.passed_at) ev.push({ at: u.passed_at, text: `${o} passed${u.pass_reason ? `: "${u.pass_reason}"` : ""}`, bad: true });
  if (u.candidate_declined_at) ev.push({ at: u.candidate_declined_at, text: `${c} decided not to continue`, bad: true });
  for (const h of hires) {
    if (h.paid_at) ev.push({ at: h.paid_at, text: `Hired ${c} 🎉`, good: true });
    if (h.refunded_at) ev.push({ at: h.refunded_at, text: "Refunded", bad: true });
  }
  for (const n of nudges) ev.push({ at: n.at, text: `${first(n.by)} emailed: "${n.subject}"` });
  return ev.sort((a, b) => a.at.localeCompare(b.at));
}
