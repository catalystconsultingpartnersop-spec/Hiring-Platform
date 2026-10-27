"use server";

import { revalidatePath } from "next/cache";
import { bookCall, cancelCall } from "@/lib/calls";
import { db } from "@/lib/db";
import { readSignedToken } from "@/lib/session";
import { formatInZone } from "@/lib/time";

export async function cancelMyCall(token: string) {
  const callId = readSignedToken(token, "call_");
  if (!callId) return { ok: false };
  await cancelCall(callId, "candidate");
  revalidatePath(`/call/${token}`);
  return { ok: true };
}

// Move to a new time: book the new one first, then cancel the old one, so a
// failed booking never leaves them with nothing.
export async function rescheduleMyCall(token: string, startIso: string, timeZone: string) {
  const callId = readSignedToken(token, "call_");
  if (!callId) return { ok: false, error: "This link has expired." };
  const { data: old } = await db().from("onboarding_calls").select("candidate_id, status").eq("id", callId).maybeSingle();
  if (!old) return { ok: false, error: "We couldn't find that call." };
  const r = await bookCall(old.candidate_id, startIso, timeZone);
  if (!r.ok) return { ok: false, error: r.error };
  if (old.status === "booked") await cancelCall(callId, "candidate_rescheduled");
  return { ok: true, when: formatInZone(startIso, timeZone), manage: `/call/${r.manageToken}` };
}
