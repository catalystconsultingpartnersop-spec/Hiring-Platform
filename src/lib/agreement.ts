import { money } from "./format";

// Every signature stores the exact text and version that was signed. Bump
// AGREEMENT_VERSION whenever the wording changes. Have a lawyer review this
// before relying on it.
export const AGREEMENT_VERSION = "2026-10-27c";

export function legalEntity() {
  return process.env.LEGAL_ENTITY?.trim() || "Catalyst Consulting Partners LLC";
}

export function agreementText(opts: {
  brand: string;
  ownerName: string;
  company: string;
  candidateRef: string;
  feeCents: number | null;
}) {
  const fee = opts.feeCents != null ? money(opts.feeCents) : "the amount stated in writing by us before the Hire";
  const company = opts.company || "the company named in the Company's account";
  return `CANDIDATE INTRODUCTION AND PLACEMENT FEE AGREEMENT
Candidate ${opts.candidateRef}

This Agreement is between ${legalEntity()}, doing business as ${opts.brand} ("we" or "us"), and ${company} (the "Company"). It is signed for the Company by ${opts.ownerName || "the person named below"}, who confirms they are authorized to bind the Company.

1. INTRODUCTION
When the Company signs, we disclose the name, contact details, resume and full profile of candidate ${opts.candidateRef} (the "Candidate"). The date of signing is the "Introduction Date."

2. PLACEMENT FEE
2.1 The Company will pay us a one-time flat fee of ${fee} (the "Fee") if, within 12 months after the Introduction Date, the Candidate is hired or engaged by any of the following (a "Hire"):
  (a) the Company;
  (b) any business that owns or controls the Company, that the Company owns or controls, or that is under common ownership or control with the Company; or
  (c) any other person or business to whom the Company, or anyone acting for it, passed on the Candidate's identity or details.
2.2 "Hired or engaged" means any paid work in any capacity: employee, contractor, consultant, freelancer, temporary or part-time, whether directly or through a staffing agency, PEO, payroll provider or other intermediary.
2.3 The Fee is owed even if the Company says it already knew of the Candidate or found them through another source. The only exception is if the Company proves, with clear and convincing written evidence dated before the Introduction Date (such as an application the Candidate submitted to the Company, payroll records, or written correspondence about a role), that it was already actively considering the Candidate for a role. The Company must send that evidence within 2 business days after the Introduction Date. A statement, recollection or email made after the Introduction Date is not enough. If the Company cannot prove it, the Fee is owed.
2.4 The Fee is the only amount owed for a Hire. There is no percentage of salary and no other charge.

3. CARD ON FILE AND PAYMENT AUTHORIZATION
3.1 To sign this Agreement, the Company must provide a valid payment card (the "Card on File"). The Company must keep a valid card on file until the Fee is paid or 12 months after the Introduction Date, whichever comes first.
3.2 The Company authorizes us to charge the Fee to the Card on File (a) when the Company tells us, on our site or otherwise, that it has decided to hire the Candidate, or (b) if a Hire takes place and the Fee has not been paid.
3.3 If a charge to the Card on File fails, the Fee is due within 10 days of our written notice.

4. NOTICE AND TIMING
The Company will tell us within 3 business days after it, or anyone listed in section 2.1, makes an offer to or engages the Candidate. The Fee is due when the Company decides to hire, and in any case no later than the Candidate's first day of work.

5. LATE PAYMENT AND COLLECTION
Any amount not paid when due bears interest at 1.5% per month, or the highest rate allowed by law if lower, from the due date until paid. The Company will pay our reasonable costs of collecting any amount owed, including attorneys' fees and court costs.

6. NO REFUNDS
The Fee is non-refundable, including if the Candidate later leaves, is let go, or does not work out. The only exception: if the Company paid and the Candidate never starts work, the Company may ask for a refund in writing within 30 days after paying. If the Candidate is later hired within the 12-month period under section 2, the Fee is owed again and may be charged to the Card on File.

7. CONFIDENTIALITY
The Company will use the Candidate's identity and details only to consider the Candidate for its own hiring, and will not share them with anyone outside the Company. This obligation continues after this Agreement ends. Sharing them does not avoid the Fee; see section 2.1(c).

8. NO GUARANTEE
We provide introductions only. We do not guarantee the Candidate's qualifications, fit, availability or performance, and we are not the Candidate's employer. The Company is solely responsible for its own interviews, reference and background checks, work-eligibility checks, compliance with employment laws, and every hiring decision. After the Fee is paid, our involvement ends.

9. LIMIT OF LIABILITY
Our total liability under or relating to this Agreement will not exceed the Fee actually paid to us. Neither party is liable to the other for indirect, incidental, special or consequential damages or lost profits.

10. GOVERNING LAW AND DISPUTES
This Agreement is governed by the laws of the State of New York, without regard to its conflict-of-law rules. Any dispute will be brought in the state or federal courts located in New York County, New York, and the Company consents to their jurisdiction. We may also bring a claim to collect amounts owed in the courts of the state where the Company is located.

11. ELECTRONIC SIGNATURE
Typing a name and confirming below is the Company's electronic signature and has the same legal effect as a handwritten signature. We keep a record of the signature, date, time, IP address and device, and email the Company a copy.

12. GENERAL
This is the entire agreement about the Candidate and replaces any earlier understanding. Changes must be in writing and agreed by both parties. If any part is found unenforceable, the rest stays in effect, and that part will be enforced to the fullest extent allowed. The Company may not transfer this Agreement without our written consent. Notices may be sent by email to the addresses on file.`;
}
