"use server";

import { db } from "@/lib/db";
import { currentOwner } from "@/lib/session";

const ID = /^[0-9a-f-]{36}$/i;

// Keeps a signed-in owner's shortlist on our side as well as in their browser.
export async function saveToShortlist(candidateId: string, on: boolean) {
  if (!ID.test(candidateId)) return;
  const owner = await currentOwner();
  if (!owner) return;
  if (on) {
    await db().from("shortlists").upsert({ owner_id: owner.id, candidate_id: candidateId }, { onConflict: "owner_id,candidate_id", ignoreDuplicates: true });
  } else {
    await db().from("shortlists").delete().eq("owner_id", owner.id).eq("candidate_id", candidateId);
  }
}

// On page load: combine what's saved in this browser with what's saved on the
// account, store the combined list on the account, and return it.
export async function syncShortlist(local: string[]): Promise<string[] | null> {
  const owner = await currentOwner();
  if (!owner) return null;
  const ids = [...new Set(local.filter((x) => typeof x === "string" && ID.test(x)))].slice(0, 200);
  const { data, error } = await db().from("shortlists").select("candidate_id").eq("owner_id", owner.id);
  if (error) return null;
  const server = (data ?? []).map((r) => r.candidate_id as string);
  const missing = ids.filter((x) => !server.includes(x));
  if (missing.length) {
    const { data: real } = await db().from("candidates").select("id").in("id", missing);
    const rows = (real ?? []).map((r) => ({ owner_id: owner.id, candidate_id: r.id }));
    if (rows.length) await db().from("shortlists").upsert(rows, { onConflict: "owner_id,candidate_id", ignoreDuplicates: true });
  }
  return [...new Set([...server, ...ids])];
}
