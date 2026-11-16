"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { answerAsk, readAskToken, type Answer } from "@/lib/timeAsk";

export async function answer(token: string, a: Answer) {
  const t = readAskToken(token);
  const r = t ? await answerAsk(t.callId, t.repId, a) : "gone";
  revalidatePath("/admin/calls");
  revalidatePath("/admin/candidates");
  redirect(`/call-time/${token}?done=${r}`);
}
