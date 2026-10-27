import { money } from "./format";

// DRAFT agreement. Have a lawyer review and replace this text before the first
// real owner signs. Bump AGREEMENT_VERSION whenever the wording changes; every
// signature stores the exact text and version that was signed.
export const AGREEMENT_VERSION = "draft-2026-10-27";

export function agreementText(opts: {
  brand: string;
  ownerName: string;
  company: string;
  candidateRef: string;
  feeCents: number | null;
}) {
  const fee = opts.feeCents != null ? money(opts.feeCents) : "the fee shown on the candidate's listing";
  return `Introduction Agreement — candidate ${opts.candidateRef}

This agreement is between ${opts.company} ("the Company"), signed by ${opts.ownerName}, and ${opts.brand} ("we").

1. What you receive. When you sign, we show you the identity, contact details and full profile of candidate ${opts.candidateRef}.

2. The fee. If the Company, or any business it owns, controls or is affiliated with, hires or engages candidate ${opts.candidateRef} in any role, as an employee, contractor or otherwise, within 12 months of today, the Company owes us a one-time flat fee of ${fee}.

3. When it's paid. The fee is paid when the Company decides to hire the candidate, before the hire is confirmed. If the hire does not go through, we refund the fee in full.

4. Your decision. You choose this candidate yourself. We make no promise about the candidate's fit or performance, and you are responsible for your own interviews, checks and hiring decision. After the fee is paid, our involvement ends.

5. Confidentiality. The candidate's identity and details are shared with you only to consider them for a role. You will not share them with anyone outside the Company.

6. No other fees. There is no percentage of salary and no other charge.

Signed electronically. Typing your name below has the same effect as a handwritten signature.`;
}
