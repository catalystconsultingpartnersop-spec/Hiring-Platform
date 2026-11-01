import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { currentCandidateId, currentOwner } from "./session";
import { getSetting } from "./settings";

// While the catalog is still filling up, people who come in through a
// candidate link (or the flyer) see only the candidate side of the site.
// Heshy turns the business side back on for them from the Share kit page.
export const SIDE_COOKIE = "tcc_side";

export async function candidatesSeeBusiness() {
  return (await getSetting<boolean>("candidates_see_business", false)) === true;
}

export async function isCandidateVisitor() {
  try {
    if (await currentOwner()) return false;
    if ((await cookies()).get(SIDE_COOKIE)?.value === "candidate") return true;
    return !!(await currentCandidateId());
  } catch {
    return false;
  }
}

// True when this visitor should only see candidate pages right now.
export async function candidateOnly() {
  if (!(await isCandidateVisitor())) return false;
  return !(await candidatesSeeBusiness());
}

// Use at the top of a business page: candidates go to their own welcome page.
export async function keepCandidatesOut() {
  if (await candidateOnly()) redirect("/join");
}
