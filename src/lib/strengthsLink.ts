import { candidateUrl } from "./format";
import { signedToken } from "./session";

// Our Strengths Assessment. A link with the candidate's token ties the result to their
// profile, even if they type a different email.
export const ASSESSMENT_NAME = "Strengths Assessment";

export function strengthsLink(candidateId?: string | null) {
  return `${candidateUrl()}/strengths${candidateId ? `?t=${encodeURIComponent(signedToken(`cand_${candidateId}`, 60))}` : ""}`;
}
