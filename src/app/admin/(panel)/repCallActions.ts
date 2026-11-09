"use server";

import { revalidatePath } from "next/cache";
import { closeRepCall, openRepCalls } from "@/lib/repCalls";
import { requireStaff } from "@/lib/session";

// The rep (or Heshy) called the owner back.
export async function markRepCallDone(requestId: string) {
  const me = await requireStaff();
  const mine = await openRepCalls(me.role === "admin" ? null : me.id);
  if (!mine.some((r) => r.id === requestId)) return;
  await closeRepCall(requestId, me.id ?? "admin");
  revalidatePath("/admin");
}
