import { legalEntity } from "./agreement";

// The short agreement every rep signs before using the back office. Each
// signature stores the exact text and version signed. Have a lawyer review it.
export const REP_AGREEMENT_VERSION = "2026-10-29";

export function repAgreementText(opts: { brand: string; repName: string; percent: number }) {
  const us = `${legalEntity()}, doing business as ${opts.brand}`;
  return `REP AGREEMENT
Independent representative

This Agreement is between ${us} ("we" or "us") and ${opts.repName || "the person signing below"} ("you").

1. THE MISSION COMES FIRST
1.1 We help people discover their natural strengths and find work that truly fits them. You are joining because you care about candidates and want to help them. That is a requirement of this role.
1.2 You will treat every candidate, client and colleague with dignity and respect, be honest with them, and never pressure anyone. If what is right for a candidate and a quick fee ever conflict, you will choose what is right for the candidate.

2. WHAT YOU DO
You hold onboarding conversations with candidates, write their profiles on our site, and support candidates and clients through introductions and hires, using our site and following our rep guide.

3. INDEPENDENT CONTRACTOR
3.1 You are an independent contractor, not an employee, partner or agent. You choose your own hours and use your own phone, computer and internet.
3.2 You are responsible for your own taxes. We will ask for a Form W-9 and issue a Form 1099 where required. You receive no employee benefits.
3.3 You may not sign anything, make any promise, or agree any fee on our behalf.

4. COMMISSION
4.1 For each candidate you bring in, we pay you ${opts.percent}% of the placement fee we actually collect for that candidate's hire, unless we agree a different amount in writing for a specific hire.
4.2 Commission is paid within 30 days after the later of (a) our receiving the fee and (b) the candidate's first day of work.
4.3 If a fee is refunded, no commission is owed on it, and any commission already paid on it will be repaid or deducted from future commission.
4.4 We may change the commission rate for future hires with 30 days' written notice. Changes never affect fees already collected.

5. CANDIDATES COME FIRST, AND STAY FREE
You will never ask for or accept money, gifts or favors from a candidate. Our service is always free for candidates.

6. CONFIDENTIALITY
6.1 Candidate and client information (names, contact details, resumes, notes, fees and anything else you see in our back office) is confidential. You will use it only for your work under this Agreement, keep it on our site, and never copy, export, sell or share it.
6.2 This continues after this Agreement ends.

7. NO WORKING AROUND US
While this Agreement is in effect and for 12 months after it ends, you will not place, or help place, any candidate or client you learned of through us outside our site, or accept any fee for doing so, without our written consent.

8. HOW YOU SPEAK FOR US
You will not promise anyone a job, salary or result. You will speak positively and honestly about candidates, clients, other recruiters and other businesses.

9. ENDING THIS AGREEMENT
9.1 Either of us may end this Agreement at any time by email.
9.2 After it ends, you still earn commission under section 4 on fees we collect within 90 days for candidates you brought in before it ended.
9.3 Sections 4.3, 6 and 7 continue after it ends.

10. GENERAL
This Agreement is governed by the laws of the State of New York. It is the entire agreement between us about this work, and changes must be in writing. Typing your name and confirming is your electronic signature and has the same effect as a handwritten one. We keep a record of the date, time and IP address.`;
}
