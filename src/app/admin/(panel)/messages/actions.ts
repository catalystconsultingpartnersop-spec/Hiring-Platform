"use server";

import { revalidatePath } from "next/cache";
import { getThread, isMine, OVERDUE_HOURS, reopen, repReplies, setLimit } from "@/lib/ownerMessages";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";

async function allowed(threadId: string) {
  const me = await requireStaff();
  const th = await getThread(threadId);
  if (!th) return null;
  if (me.role !== "admin" && !me.manager && th.t.staff_id !== me.id) return null;
  return { me, th };
}

export async function answerOwner(threadId: string, _prev: { ok: boolean; error?: string } | null, fd: FormData) {
  const a = await allowed(threadId);
  if (!a) return { ok: false, error: "You can't answer this one." };
  // Someone else's conversation: only step in once the owner has waited a day (Heshy can always step in).
  let forRep: string | undefined;
  if (!isMine(a.th.t, a.me)) {
    const last = a.th.msgs.at(-1);
    const overdue = last?.from === "owner" && Date.now() - Date.parse(last.at) >= OVERDUE_HOURS * 36e5;
    if (a.me.role !== "admin" && !overdue) return { ok: false, error: "This is another rep's conversation. You can step in if it goes a day without an answer." };
    const { data } = await db().from("staff").select("full_name").eq("id", a.th.t.staff_id ?? "").maybeSingle();
    forRep = ((data?.full_name as string | null) ?? "the rep").split(" ")[0];
  }
  const r = await repReplies(threadId, { id: a.me.id, name: a.me.name }, String(fd.get("text") ?? ""), forRep);
  revalidatePath(`/admin/messages/${threadId}`);
  return r;
}

export async function limitOwner(threadId: string) {
  const a = await allowed(threadId);
  if (!a || (!isMine(a.th.t, a.me) && a.me.role !== "admin")) return;
  await setLimit(threadId, { id: a.me.id, name: a.me.name });
  revalidatePath(`/admin/messages/${threadId}`);
}

export async function reopenOwner(threadId: string) {
  const a = await allowed(threadId);
  if (!a || a.me.role !== "admin") return;
  await reopen(a.th.t.email, a.me.name);
  revalidatePath(`/admin/messages/${threadId}`);
}

export async function saveBio(staffId: string, _prev: { ok: boolean; error?: string } | null, fd: FormData) {
  const me = await requireStaff();
  if (me.id !== staffId && me.role !== "admin") return { ok: false, error: "You can only change your own bio." };
  const { setBio } = await import("@/lib/staffBios");
  const b = { line: String(fd.get("line") ?? "").trim(), bio: String(fd.get("bio") ?? "").trim() };
  await setBio(staffId, b);
  // Heshy's bio covers both his own candidates and the ones whose rep has left.
  if (staffId === "heshy" && me.id) await setBio(me.id, b);
  revalidatePath("/admin/messages");
  revalidatePath(`/admin/team/${staffId}`);
  return { ok: true };
}
