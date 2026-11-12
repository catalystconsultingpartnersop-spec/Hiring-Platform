"use server";

import { revalidatePath } from "next/cache";
import { NudgeKind, sendNudge } from "@/lib/clientFollowUp";
import { db, logActivity } from "@/lib/db";
import { requireStaff, staffActor } from "@/lib/session";

export type NudgeState = { ok?: boolean; error?: string };

const KINDS: NudgeKind[] = ["meet", "how", "deciding", "checkin"];

export async function sendClientNudge(_: NudgeState, form: FormData): Promise<NudgeState> {
  const me = await requireStaff();
  const ownerId = String(form.get("owner_id") ?? "");
  const unlockId = String(form.get("unlock_id") ?? "") || null;
  const kind = String(form.get("kind") ?? "checkin") as NudgeKind;
  const subject = String(form.get("subject") ?? "").trim().slice(0, 200);
  const body = String(form.get("body") ?? "").trim().slice(0, 4000);
  if (!subject || !body) return { error: "Add a subject and a message." };
  if (!KINDS.includes(kind)) return { error: "Something went wrong. Try again." };
  const { data: owner } = await db().from("owners").select("id, email").eq("id", ownerId).maybeSingle();
  if (!owner) return { error: "We couldn't find this client." };
  let candidateId: string | null = null;
  if (unlockId) {
    const { data: u } = await db().from("unlocks").select("candidate_id, owner_id").eq("id", unlockId).maybeSingle();
    if (!u || u.owner_id !== ownerId) return { error: "Something went wrong. Try again." };
    candidateId = u.candidate_id as string;
  }
  try {
    await sendNudge({ ownerId, ownerEmail: owner.email as string, unlockId, candidateId, kind, subject, body, by: { name: me.name || me.email, email: me.email } });
  } catch {
    return { error: "The email didn't go out. Try again in a minute." };
  }
  revalidatePath(`/admin/clients/${ownerId}`);
  return { ok: true };
}

export async function addClientNote(_: NudgeState, form: FormData): Promise<NudgeState> {
  const me = await requireStaff();
  const ownerId = String(form.get("owner_id") ?? "");
  const text = String(form.get("text") ?? "").trim().slice(0, 2000);
  if (!text) return { error: "Write a note first." };
  await logActivity(staffActor(me), "client_note", { owner_id: ownerId, text, by: me.name || me.email });
  revalidatePath(`/admin/clients/${ownerId}`);
  return { ok: true };
}

export async function removeClientNote(ownerId: string, noteId: string) {
  const me = await requireStaff();
  await logActivity(staffActor(me), "client_note_removed", { owner_id: ownerId, note_id: noteId });
  revalidatePath(`/admin/clients/${ownerId}`);
}
