"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, logActivity, Unlock } from "@/lib/db";
import { refCode } from "@/lib/format";

import { Meeting } from "@/lib/path";
import { emailRefsRequested, emailTimesOffered, emailVerdict } from "@/lib/pathEmails";
import { requireOwner } from "@/lib/session";
import { validTimeZone, zonedToUtc } from "@/lib/time";

// The client's side of the hiring path.

async function myUnlock(candidateId: string) {
  const owner = await requireOwner(`/candidates/${candidateId}`);
  const { data } = await db()
    .from("unlocks")
    .select("*")
    .eq("owner_id", owner.id)
    .eq("candidate_id", candidateId)
    .not("confirmed_at", "is", null)
    .maybeSingle();
  if (!data) redirect(`/candidates/${candidateId}`);
  return { owner, unlock: data as Unlock };
}

export type OfferState = { error?: string };

// "2026-11-03T14:30" in the client's zone -> ISO.
function toIso(local: string, tz: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  return new Date(zonedToUtc(+m[1], +m[2], +m[3], +m[4] * 60 + +m[5], tz)).toISOString();
}

export async function offerTimes(candidateId: string, kind: "call" | "meeting", _prev: OfferState, form: FormData): Promise<OfferState> {
  const { owner, unlock } = await myUnlock(candidateId);
  const tz = validTimeZone(String(form.get("tz") ?? ""));
  const mode = String(form.get("mode") ?? "phone") as Meeting["mode"];
  if (!["phone", "video", "in_person"].includes(mode)) return { error: "Pick how you'd like to meet." };
  let place = String(form.get("place") ?? "").trim().slice(0, 500);
  // Video with no link of their own: we make a Google Meet link for them.
  if (mode === "video" && !place) place = (await (await import("@/lib/googleCalls")).newMeetingRoom().catch(() => null)) ?? "";
  if (mode === "video" && !/^https?:\/\/\S+$/i.test(place)) return { error: "We couldn't make a video link just now. Tap “Use my own link” and paste yours, or try again." };
  if (mode === "in_person" && place.length < 4) return { error: "Add the address where you'll meet." };
  const minutes = Math.min(120, Math.max(10, Number(form.get("minutes")) || 30));
  const note = String(form.get("note") ?? "").trim().slice(0, 500) || null;

  const now = Date.now();
  const slots = [...new Set(form.getAll("slot").map((v) => toIso(String(v), tz)).filter((v): v is string => !!v))]
    .filter((iso) => Date.parse(iso) > now + 30 * 60e3)
    .sort();
  if (!slots.length) return { error: "Add at least one time, later than the next half hour." };

  // A new offer replaces any open one.
  await db()
    .from("meetings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("unlock_id", unlock.id)
    .in("status", ["proposed", "declined"]);
  const { data, error } = await db()
    .from("meetings")
    .insert({ unlock_id: unlock.id, kind, mode, place: mode === "phone" ? null : place, slots, minutes, note, time_zone: tz })
    .select("*")
    .single();
  if (error || !data) return { error: "Something went wrong saving your times. Try again." };
  await logActivity(`owner:${owner.email}`, "times_offered", { candidate: refCode(candidateId), kind, slots: slots.length });
  try {
    await emailTimesOffered(data as Meeting);
  } catch (e) {
    console.error(e);
  }
  redirect(`/candidates/${candidateId}?step=offered#next`);
}

export async function withdrawOffer(candidateId: string, meetingId: string) {
  const { unlock } = await myUnlock(candidateId);
  await db()
    .from("meetings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", meetingId)
    .eq("unlock_id", unlock.id)
    .eq("status", "proposed");
  redirect(`/candidates/${candidateId}#next`);
}

export async function ownerKeepGoing(candidateId: string, meetingId: string) {
  const { owner, unlock } = await myUnlock(candidateId);
  const { data } = await db()
    .from("meetings")
    .update({ owner_verdict: "yes", updated_at: new Date().toISOString() })
    .eq("id", meetingId)
    .eq("unlock_id", unlock.id)
    .select("*")
    .maybeSingle();
  if (data) {
    await logActivity(`owner:${owner.email}`, "owner_keep_going", { candidate: refCode(candidateId), kind: data.kind });
    try {
      await emailVerdict(data as Meeting, "owner", "yes");
    } catch (e) {
      console.error(e);
    }
  }
  redirect(`/candidates/${candidateId}?step=yes#next`);
}

export async function askReferences(candidateId: string, form: FormData) {
  const { owner, unlock } = await myUnlock(candidateId);
  const note = String(form.get("note") ?? "").trim().slice(0, 500) || null;
  await db().from("reference_requests").insert({ unlock_id: unlock.id, note });
  await logActivity(`owner:${owner.email}`, "references_requested", { candidate: refCode(candidateId) });
  try {
    await emailRefsRequested(unlock.id, note);
  } catch (e) {
    console.error(e);
  }
  redirect(`/candidates/${candidateId}?step=refs#next`);
}

// ---- Already further along? The client tells us what already happened. ----

const cutoff = () => new Date().toISOString();

// Clears anything still open (times offered, or a booked time that hasn't come yet).
async function clearOpen(unlockId: string) {
  const now = new Date().toISOString();
  await db().from("meetings").update({ status: "cancelled", updated_at: now }).eq("unlock_id", unlockId).in("status", ["proposed", "declined"]);
  await db().from("meetings").update({ status: "cancelled", updated_at: now }).eq("unlock_id", unlockId).eq("status", "booked").gt("starts_at", now);
}

async function recordDone(candidateId: string, kind: "call" | "meeting") {
  const { owner, unlock } = await myUnlock(candidateId);
  await clearOpen(unlock.id);
  const minutes = kind === "call" ? 15 : 60;
  const at = new Date(Date.now() - minutes * 60e3 - 60e3).toISOString();
  const { data } = await db()
    .from("meetings")
    .insert({ unlock_id: unlock.id, kind, mode: kind === "call" ? "phone" : "in_person", place: null, slots: [at], minutes, time_zone: null, status: "booked", starts_at: at, owner_verdict: "yes", note: "Told us it already happened" })
    .select("*")
    .single();
  await logActivity(`owner:${owner.email}`, kind === "call" ? "owner_already_spoke" : "owner_already_met", { candidate: refCode(candidateId), at: cutoff() });
  if (data)
    try {
      await emailVerdict(data as Meeting, "owner", "yes");
    } catch (e) {
      console.error(e);
    }
}

export async function alreadySpoke(candidateId: string) {
  await recordDone(candidateId, "call");
  redirect(`/candidates/${candidateId}?step=spoke#next`);
}

export async function alreadyMet(candidateId: string) {
  await recordDone(candidateId, "meeting");
  redirect(`/candidates/${candidateId}?step=met#next`);
}

// "We already set a time ourselves": the meeting goes straight to booked, and
// both sides get the confirmation with calendar buttons.
export async function setOwnTime(candidateId: string, _prev: OfferState, form: FormData): Promise<OfferState> {
  const { owner, unlock } = await myUnlock(candidateId);
  const tz = validTimeZone(String(form.get("tz") ?? ""));
  const kind = form.get("kind") === "call" ? "call" : "meeting";
  const mode = String(form.get("mode") ?? "in_person") as Meeting["mode"];
  if (!["phone", "video", "in_person"].includes(mode)) return { error: "Pick how you're meeting." };
  let place = String(form.get("place") ?? "").trim().slice(0, 500);
  if (mode === "video" && !place) place = (await (await import("@/lib/googleCalls")).newMeetingRoom().catch(() => null)) ?? "";
  const iso = toIso(`${form.get("day")}T${form.get("time")}`, tz);
  if (!iso) return { error: "Pick the day and time." };
  if (Date.parse(iso) < Date.now() - 60 * 60e3) return { error: "That time has passed. If you already met, tap “We already met” instead." };
  await clearOpen(unlock.id);
  const { data, error } = await db()
    .from("meetings")
    .insert({ unlock_id: unlock.id, kind, mode, place: mode === "phone" ? null : place || null, slots: [iso], minutes: kind === "call" ? 20 : 60, time_zone: tz, status: "booked", starts_at: iso, note: "Set by the client directly" })
    .select("*")
    .single();
  if (error || !data) return { error: "Something went wrong saving it. Try again." };
  await logActivity(`owner:${owner.email}`, "owner_set_own_time", { candidate: refCode(candidateId), kind, at: iso });
  try {
    const { emailBooked } = await import("@/lib/pathEmails");
    await emailBooked(data as Meeting);
  } catch (e) {
    console.error(e);
  }
  redirect(`/candidates/${candidateId}?step=set#next`);
}

// Every step can be skipped: "skip the call, straight to a meeting", or
// "skip the meeting, straight to deciding". The rep is told; the candidate isn't bothered.
export async function skipStep(candidateId: string, kind: "call" | "meeting") {
  const { owner, unlock } = await myUnlock(candidateId);
  await clearOpen(unlock.id);
  const at = new Date(Date.now() - 2 * 60e3).toISOString();
  await db()
    .from("meetings")
    .insert({ unlock_id: unlock.id, kind, mode: kind === "call" ? "phone" : "in_person", place: null, slots: [at], minutes: 1, time_zone: null, status: "booked", starts_at: at, owner_verdict: "yes", note: "Skipped by the client" });
  await logActivity(`owner:${owner.email}`, kind === "call" ? "owner_skipped_call" : "owner_skipped_meeting", { candidate: refCode(candidateId) });
  try {
    const { emailSkipped } = await import("@/lib/pathEmails");
    await emailSkipped(unlock.id, kind);
  } catch (e) {
    console.error(e);
  }
  redirect(`/candidates/${candidateId}?step=${kind === "call" ? "skipcall" : "skipmeeting"}#next`);
}

// Bring someone along (a partner, a manager): they get the time, the calendar invite,
// the resume and the one-page summary.
export async function inviteGuest(candidateId: string, meetingId: string, _prev: { ok?: string; error?: string }, form: FormData): Promise<{ ok?: string; error?: string }> {
  const { owner, unlock } = await myUnlock(candidateId);
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!name) return { error: "Add their name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email doesn't look right." };
  const { data: m } = await db().from("meetings").select("*").eq("id", meetingId).eq("unlock_id", unlock.id).maybeSingle();
  if (!m || m.status !== "booked") return { error: "This meeting isn't booked yet." };
  const { addGuest } = await import("@/lib/meetingGuests");
  await addGuest(meetingId, { name, email });
  try {
    const { emailGuest } = await import("@/lib/pathEmails");
    await emailGuest(m as Meeting, { name, email });
  } catch (e) {
    console.error(e);
    return { error: "We couldn't send it just now. Try again in a minute." };
  }
  await logActivity(`owner:${owner.email}`, "owner_invited_guest", { candidate: refCode(candidateId), guest: email });
  revalidatePath(`/candidates/${candidateId}`);
  return { ok: `Sent to ${name.split(" ")[0]}.` };
}
