"use server";

import { revalidatePath } from "next/cache";
import { makeMemory, setHook } from "@/lib/memory";
import { requireStaff } from "@/lib/session";

export async function saveHook(candidateId: string, form: FormData) {
  await requireStaff();
  const hook = String(form.get("hook") ?? "").trim();
  if (hook) await setHook(candidateId, hook);
  revalidatePath("/admin/candidates");
}

export async function refreshMemory(candidateId: string) {
  await requireStaff();
  await makeMemory(candidateId).catch(() => false);
  revalidatePath("/admin/candidates");
}
