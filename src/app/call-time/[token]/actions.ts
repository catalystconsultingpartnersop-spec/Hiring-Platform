"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { answerAsk, readAskToken } from "@/lib/timeAsk";

export async function answer(token: string, yes: boolean) {
  const t = readAskToken(token);
  const r = t ? await answerAsk(t.callId, t.repId, yes) : "gone";
  revalidatePath("/admin/calls");
  redirect(`/call-time/${token}?done=${r}`);
}
