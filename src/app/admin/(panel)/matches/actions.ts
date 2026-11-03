"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, logActivity } from "@/lib/db";
import { requireStaff, staffActor } from "@/lib/session";
import { allow, SLOW_DOWN } from "@/lib/throttle";
import { POSITION_FIELDS, readJobPost, type PositionDraft } from "@/lib/positions";

export async function fillFromPost(text: string): Promise<{ draft?: PositionDraft; error?: string }> {
  const me = await requireStaff();
  if (!text.trim()) return { error: "Paste the job post first." };
  if (!(await allow(`jobpost:${me.id ?? me.email}`, 10, 60))) return { error: SLOW_DOWN };
  const r = await readJobPost(text);
  return "error" in r ? { error: r.error as string } : { draft: r };
}

const toInt = (v: string) => {
  const n = Number(v.replace(/[$,\s]/g, "").replace(/k$/i, "000"));
  return v.trim() && Number.isFinite(n) ? Math.round(n) : null;
};

export async function savePosition(id: string | null, _prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const me = await requireStaff();
  const get = (k: string) => String(form.get(k) ?? "").trim();
  if (!get("title")) return { error: "Give the position a title." };
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const f of POSITION_FIELDS) {
    if (f === "salary_min" || f === "salary_max") row[f] = toInt(get(f));
    else row[f] = get(f).slice(0, f === "description" ? 4000 : 300) || null;
  }
  let posId = id;
  if (id) {
    const { error } = await db().from("positions").update(row).eq("id", id);
    if (error) return { error: `Couldn't save: ${error.message}` };
  } else {
    const { data, error } = await db()
      .from("positions")
      .insert({ ...row, source: "manual", added_by: staffActor(me) })
      .select("id")
      .single();
    if (error || !data) return { error: `Couldn't save: ${error?.message ?? "unknown"}` };
    posId = data.id as string;
    await logActivity(staffActor(me), "position_added", { position_id: posId, title: row.title });
  }
  revalidatePath("/admin/matches");
  redirect(`/admin/matches/${posId}${id ? "?saved=1" : ""}`);
}

export async function setPositionStatus(id: string, status: "open" | "closed") {
  const me = await requireStaff();
  await db().from("positions").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  await logActivity(staffActor(me), status === "closed" ? "position_closed" : "position_reopened", { position_id: id });
  revalidatePath("/admin/matches");
  redirect(status === "closed" ? "/admin/matches?closed=1" : `/admin/matches/${id}`);
}
