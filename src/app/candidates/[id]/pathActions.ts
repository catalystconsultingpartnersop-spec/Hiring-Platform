"use server";

import { redirect } from "next/navigation";
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
  const place = String(form.get("place") ?? "").trim().slice(0, 500);
  if (mode === "video" && !/^https?:\/\/\S+$/i.test(place)) return { error: "Paste your video link (Zoom, Google Meet or Teams)." };
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
