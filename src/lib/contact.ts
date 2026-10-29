import { db } from "./db";
import { repFor } from "./notify";
import { isOwnerEmail } from "./session";

export type TeamMember = { id: string; email: string; full_name: string | null };

// Partners get anything without a more specific person to go to.
export async function partners(): Promise<TeamMember[]> {
  const { data } = await db().from("staff").select("id, email, full_name, is_partner, active").eq("is_partner", true).eq("active", true);
  return ((data ?? []) as (TeamMember & { is_partner: boolean })[]).filter((p) => !isOwnerEmail(p.email));
}

// Who on the team should hear about something to do with this candidate:
// their rep, or the partners if there is no rep. (Heshy is always copied
// separately through emailAdmin.)
export async function teamFor(candidateId: string | null): Promise<TeamMember[]> {
  if (candidateId) {
    const rep = await repFor(candidateId);
    if (rep && rep.active && !isOwnerEmail(rep.email)) return [rep];
  }
  return partners();
}
