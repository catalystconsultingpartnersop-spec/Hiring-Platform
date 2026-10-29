import { db } from "./db";
import { currentOwner } from "./session";

// Hiring documents come with a client's first unlocked candidate.
export async function ownerHasDocs() {
  const owner = await currentOwner().catch(() => null);
  if (!owner) return { owner: null, hasDocs: false };
  const { count } = await db()
    .from("unlocks")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", owner.id)
    .not("confirmed_at", "is", null);
  return { owner, hasDocs: (count ?? 0) > 0 };
}
