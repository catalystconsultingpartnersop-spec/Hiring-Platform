"use server";

import { revalidatePath } from "next/cache";
import { getThread, reopen, repReplies, setLimit } from "@/lib/ownerMessages";
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
  const r = await repReplies(threadId, { id: a.me.id, name: a.me.name }, String(fd.get("text") ?? ""));
  revalidatePath(`/admin/messages/${threadId}`);
  return r;
}

export async function limitOwner(threadId: string) {
  const a = await allowed(threadId);
  if (!a) return;
  await setLimit(threadId, { id: a.me.id, name: a.me.name });
  revalidatePath(`/admin/messages/${threadId}`);
}

export async function reopenOwner(threadId: string) {
  const a = await allowed(threadId);
  if (!a || a.me.role !== "admin") return;
  await reopen(a.th.t.email, a.me.name);
  revalidatePath(`/admin/messages/${threadId}`);
}
