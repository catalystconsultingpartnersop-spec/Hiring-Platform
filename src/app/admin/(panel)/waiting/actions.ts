"use server";

import { revalidatePath } from "next/cache";
import { db, logActivity } from "@/lib/db";
import { requireStaff, staffActor } from "@/lib/session";

// "I called them": takes the owner off the waiting list and records who called.
export async function markLeadCalled(leadId: string, form: FormData) {
  const me = await requireStaff();
  if (!me.manager) return;
  if (!/^\d+$/.test(leadId)) return;
  const { data } = await db().from("activity_log").select("id").eq("id", leadId).in("action", ["owner_callback_request", "owner_meeting_request"]).maybeSingle();
  if (!data) return;
  const note = String(form.get("note") ?? "").trim().slice(0, 300) || null;
  await logActivity(staffActor(me), "owner_lead_done", { lead_id: leadId, by: me.name || me.email, note });
  for (const p of ["/admin", "/admin/reps", "/admin/waiting"]) revalidatePath(p);
}
