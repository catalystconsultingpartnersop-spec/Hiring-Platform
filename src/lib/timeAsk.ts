import { db, logActivity } from "./db";
import { escapeHtml as e, sendEmail } from "./email";
import { kit } from "./emailKit";
import { siteUrl } from "./format";
import { readSignedToken, signedToken } from "./session";

// When a candidate is switched to a new rep and the booked time is outside that
// rep's hours (or they have another call then), the call does NOT move by
// itself. The new rep is asked first. Until they say yes, it stays where it is.

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
type Ask = { at: string; action: string; details: { call_id: string; to: string; to_name?: string; by_email?: string; by_name?: string } };

export const askToken = (callId: string, repId: string) => signedToken(`timeask_${callId}_${repId}`, 30);
export function readAskToken(token: string) {
  const v = readSignedToken(token, "timeask_");
  if (!v) return null;
  const [callId, repId] = v.split("_");
  return callId && repId ? { callId, repId } : null;
}

export async function askRepForTime(callId: string, rep: { id: string; email: string; full_name: string | null }, by: { name: string; email: string; actor: string }) {
  const { data: k } = await db().from("onboarding_calls").select("id, starts_at, candidates(full_name), staff(full_name)").eq("id", callId).maybeSingle();
  if (!k) return false;
  const cand = (k.candidates as unknown as { full_name: string }).full_name;
  const cur = ((k.staff as unknown as { full_name: string | null } | null)?.full_name ?? "the current rep").split(" ")[0];
  const link = `${siteUrl()}/call-time/${askToken(callId, rep.id)}`;
  const html =
    kit.hi(rep.full_name) +
    kit.p(`<strong>${e(cand)}</strong> is now your candidate, and already has a call booked.`) +
    kit.facts([["The call", e(when(k.starts_at))], ["Booked with", e(cur)]]) +
    kit.p("That time isn't in your open hours. Can you take it?") +
    kit.button(link, "Yes or no") +
    kit.p(`Until you answer, the call stays with ${e(cur)}. If you say no, ${e(cand.split(" ")[0])} gets a link to pick a new time with you.`);
  await sendEmail({ to: rep.email, subject: `Can you take ${cand}'s call on ${when(k.starts_at)}?`, html, audience: "team", replyTo: by.email });
  const { textTeam } = await import("./texts");
  await textTeam.timeAsk(rep.id, cand.split(" ")[0], when(k.starts_at), link, callId).catch(() => {});
  await logActivity(by.actor, "call_time_ask", { call_id: callId, to: rep.id, to_name: rep.full_name ?? rep.email, by_email: by.email, by_name: by.name });
  return true;
}

async function asks(callIds: string[]) {
  if (!callIds.length) return [] as Ask[];
  const { data } = await db().from("activity_log").select("at, action, details").in("action", ["call_time_ask", "call_time_yes", "call_time_no", "call_time_lapsed"]).in("details->>call_id", callIds).order("at", { ascending: true });
  return (data ?? []) as Ask[];
}

// Calls that are still waiting on a rep's answer: call id → who was asked.
export async function pendingAsks(callIds: string[]) {
  const last = new Map<string, Ask>();
  for (const a of await asks(callIds)) last.set(a.details.call_id, a);
  const out = new Map<string, Ask["details"]>();
  for (const [id, a] of last) if (a.action === "call_time_ask") out.set(id, a.details);
  return out;
}

export async function answerAsk(callId: string, repId: string, yes: boolean): Promise<"moved" | "rebook" | "gone" | "busy"> {
  const pending = (await pendingAsks([callId])).get(callId);
  const { data: k } = await db().from("onboarding_calls").select("id, staff_id, status, starts_at, ends_at, candidate_id, candidates(full_name)").eq("id", callId).maybeSingle();
  if (!pending || pending.to !== repId || !k || k.status !== "booked" || Date.parse(k.ends_at) < Date.now()) return "gone";
  const cand = (k.candidates as unknown as { full_name: string }).full_name;
  const { data: rep } = await db().from("staff").select("full_name, email").eq("id", repId).maybeSingle();
  const who = (rep?.full_name ?? "The new rep").split(" ")[0];
  const { takeOverCall, closeDuplicateCalls, cancelCall } = await import("./calls");
  let result: "moved" | "rebook" | "busy" = "rebook";
  if (yes) {
    const { count } = await db().from("onboarding_calls").select("id", { count: "exact", head: true }).eq("staff_id", repId).eq("status", "booked").neq("candidate_id", k.candidate_id).lt("starts_at", k.ends_at).gt("ends_at", k.starts_at);
    if (count) return "busy";
    await takeOverCall(callId, repId);
    await closeDuplicateCalls(callId);
    result = "moved";
  } else await cancelCall(callId, `staff:${rep?.email ?? repId}`);
  await logActivity(`staff:${rep?.email ?? repId}`, yes ? "call_time_yes" : "call_time_no", { call_id: callId, to: repId });
  if (pending.by_email)
    await sendEmail({
      to: pending.by_email,
      subject: yes ? `${who} took ${cand}'s call` : `${who} can't make ${cand}'s call`,
      html: kit.p(yes ? `${e(who)} said yes. The call on ${e(when(k.starts_at))} is now with ${e(who)}.` : `${e(who)} can't make ${e(when(k.starts_at))}. The call was cancelled, and ${e(cand.split(" ")[0])} got a link to pick a new time with ${e(who)}.`),
      audience: "team",
    }).catch(() => null);
  return result;
}

// Cron: nobody answered and the call is three hours away. It stays with the
// rep who has it, and whoever made the switch is told.
export async function lapseAsks(nowMs = Date.now()) {
  const { data } = await db().from("onboarding_calls").select("id, starts_at, candidates(full_name), staff(full_name)").eq("status", "booked").gt("starts_at", new Date(nowMs).toISOString()).lt("starts_at", new Date(nowMs + 3 * 36e5).toISOString());
  const soon = (data ?? []) as unknown as { id: string; starts_at: string; candidates: { full_name: string }; staff: { full_name: string | null } | null }[];
  const pending = await pendingAsks(soon.map((k) => k.id));
  for (const k of soon) {
    const p = pending.get(k.id);
    if (!p) continue;
    await logActivity("system", "call_time_lapsed", { call_id: k.id, to: p.to });
    if (p.by_email)
      await sendEmail({
        to: p.by_email,
        subject: `${(p.to_name ?? "The new rep").split(" ")[0]} didn't answer about ${k.candidates.full_name}'s call`,
        html: kit.p(`The call on ${e(when(k.starts_at))} is still with ${e((k.staff?.full_name ?? "the current rep").split(" ")[0])}.`),
        audience: "team",
      }).catch(() => null);
  }
}
