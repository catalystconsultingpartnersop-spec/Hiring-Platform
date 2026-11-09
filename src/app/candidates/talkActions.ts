"use server";

import { cookies } from "next/headers";
import { ownerReplies, ownerWrites, type MsgKind, type SendResult } from "@/lib/ownerMessages";
import { currentOwner, readSignedToken, signedToken } from "@/lib/session";

export async function sendToRep(_prev: SendResult | null, fd: FormData): Promise<SendResult> {
  const owner = await currentOwner().catch(() => null);
  const s = (k: string) => String(fd.get(k) ?? "");
  const r = await ownerWrites({
    candidateId: s("candidate_id"),
    kind: s("kind") as MsgKind,
    name: s("name") || owner?.full_name || "",
    company: s("company") || owner?.company || "",
    phone: s("phone") || owner?.phone || "",
    email: owner?.email || s("email"),
    when: s("when"),
    text: s("text"),
  });
  // Remember the conversation in this browser, so the candidate page links back to it.
  if (r.ok)
    (await cookies()).set(`tcc_talk_${s("candidate_id").slice(0, 8)}`, signedToken(`thr_${r.threadId}`, 180), {
      maxAge: 180 * 864e5 / 1000,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  return r;
}

export async function replyAsOwner(token: string, _prev: { ok: boolean; error?: string } | null, fd: FormData) {
  const id = readSignedToken(token, "thr_");
  if (!id) return { ok: false, error: "This link has expired. Open the newest email from us." };
  return ownerReplies(id, String(fd.get("text") ?? ""));
}
