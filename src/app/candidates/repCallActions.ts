"use server";

import { askForRepCall, type AskResult } from "@/lib/repCalls";
import { currentOwner } from "@/lib/session";

export async function requestRepCall(_prev: AskResult | null, fd: FormData): Promise<AskResult> {
  const owner = await currentOwner().catch(() => null);
  const s = (k: string) => String(fd.get(k) ?? "");
  return askForRepCall({
    candidateId: s("candidate_id"),
    name: s("name") || owner?.full_name || "",
    company: s("company") || owner?.company || "",
    phone: s("phone"),
    // A signed-in owner's calls count against their account email.
    email: owner?.email || s("email"),
    when: s("when"),
    note: s("note"),
  });
}
