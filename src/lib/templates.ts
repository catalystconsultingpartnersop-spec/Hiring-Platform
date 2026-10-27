// Fill-in-the-blanks hiring paperwork for owners. Each body uses a tiny
// markup: "# " title, "## " heading, "- " bullet, "[ ] " checkbox,
// "SIGN:" a signature line, and {{field}} for the blanks.

export type Field = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "date" | "textarea";
  prefill?: "company" | "owner" | "ownerEmail" | "today" | "candidate" | "jobTitle" | "startDate";
};

export type Template = {
  slug: string;
  title: string;
  blurb: string;
  when: string;
  fields: Field[];
  body: string;
  note?: string;
};

const LEGAL_NOTE =
  "This is a general template, not legal advice. Employment law differs by state, so have your lawyer or HR provider review it before you use it.";

export const TEMPLATES: Template[] = [
  {
    slug: "offer-letter",
    title: "Offer letter",
    blurb: "A clear, friendly written offer: role, pay, start date and the basics.",
    when: "Send it after a verbal yes, so everything is in writing.",
    note: LEGAL_NOTE,
    fields: [
      { key: "company", label: "Company name", prefill: "company" },
      { key: "date", label: "Date", type: "date", prefill: "today" },
      { key: "candidate", label: "Candidate's name", prefill: "candidate" },
      { key: "job_title", label: "Job title", prefill: "jobTitle" },
      { key: "manager", label: "Reports to", placeholder: "Name and title" },
      { key: "start_date", label: "Start date", type: "date", prefill: "startDate" },
      { key: "pay", label: "Pay", placeholder: "e.g. $72,000 per year, paid every two weeks" },
      { key: "status", label: "Full-time or part-time, exempt or non-exempt", placeholder: "e.g. Full-time, exempt" },
      { key: "schedule", label: "Schedule and location", placeholder: "e.g. Mon–Fri, 8:30–5, at our Newark office" },
      { key: "benefits", label: "Benefits", type: "textarea", placeholder: "e.g. Health insurance after 30 days, 10 days paid time off, 401(k)" },
      { key: "conditions", label: "Conditions (optional)", placeholder: "e.g. a background check and proof of work eligibility" },
      { key: "respond_by", label: "Please reply by", type: "date" },
      { key: "signer", label: "Your name", prefill: "owner" },
      { key: "signer_title", label: "Your title", placeholder: "e.g. Owner" },
    ],
    body: `# {{company}}
{{date}}

Dear {{candidate}},

We're delighted to offer you the position of {{job_title}} at {{company}}. We were impressed by you and we're excited about what you'll bring to the team.

## The details
- Position: {{job_title}}, reporting to {{manager}}
- Start date: {{start_date}}
- Pay: {{pay}}
- Status: {{status}}
- Schedule and location: {{schedule}}
- Benefits: {{benefits}}

## A few things to know
This offer is contingent on {{conditions}}. On your first day, please bring documents that show you're eligible to work in the United States, as required by federal law (Form I-9).

Your employment with {{company}} is at will. That means either you or the company can end it at any time, with or without cause or notice. Nothing in this letter is a contract for a set period of time.

This letter is our complete offer and replaces anything discussed before. Any changes must be in writing.

## Next step
If you accept, please sign below and return a copy by {{respond_by}}. If you have any questions at all, just call me.

We're looking forward to working with you.

Sincerely,

{{signer}}
{{signer_title}}, {{company}}

## Acceptance
I accept this offer on the terms above.

SIGN: {{candidate}}
SIGN: Date`,
  },
  {
    slug: "nda",
    title: "Employee confidentiality agreement (NDA)",
    blurb: "Protects your customer lists, pricing and how you do things. No non-compete.",
    when: "Have new hires sign it on day one, with their other paperwork.",
    note: `${LEGAL_NOTE} It deliberately has no non-compete: several states, including New York, restrict them.`,
    fields: [
      { key: "company", label: "Company name", prefill: "company" },
      { key: "state", label: "Company's state", placeholder: "e.g. New York" },
      { key: "employee", label: "Employee's name", prefill: "candidate" },
      { key: "date", label: "Date", type: "date", prefill: "today" },
      { key: "signer", label: "Signing for the company", prefill: "owner" },
    ],
    body: `# Employee Confidentiality Agreement

This Agreement is between {{company}} (the "Company") and {{employee}} (the "Employee"), dated {{date}}.

## 1. Confidential information
"Confidential Information" means non-public information about the Company's business that the Employee learns through their work, including customer and supplier lists and details, pricing, costs, bids, financial information, business plans, methods, software, passwords and personnel information. It does not include information that is public through no fault of the Employee, or that the Employee already lawfully knew.

## 2. What the Employee agrees to
- Use Confidential Information only to do their job for the Company.
- Not share it with anyone outside the Company, during or after employment, unless the Company agrees in writing or the law requires it.
- Keep it reasonably secure, and not copy it to personal accounts or devices except as the Company allows.
- Return or delete all Company information and property when their employment ends, or sooner if asked.

## 3. Work product
Work the Employee creates as part of their job belongs to the Company.

## 4. Your rights are protected
Nothing in this Agreement stops the Employee from discussing wages, hours or working conditions, reporting possible violations of law to a government agency, or taking part in a government investigation. Under the federal Defend Trade Secrets Act, an individual is not liable for disclosing a trade secret in confidence to a government official or an attorney solely to report or investigate a suspected violation of law, or in a sealed court filing.

## 5. General
This Agreement does not change the at-will nature of employment. It is governed by the laws of the State of {{state}}. If any part is found unenforceable, the rest stays in effect.

SIGN: {{employee}}, Employee
SIGN: {{signer}}, for {{company}}`,
  },
  {
    slug: "contractor-agreement",
    title: "Independent contractor agreement",
    blurb: "For freelance or project work instead of a regular employee.",
    when: "Only use this if the person truly runs their own business. Read “Employee or contractor?” first.",
    note: `${LEGAL_NOTE} Calling someone a contractor doesn't make them one; how the work is actually done decides it.`,
    fields: [
      { key: "company", label: "Company name", prefill: "company" },
      { key: "state", label: "Company's state", placeholder: "e.g. New Jersey" },
      { key: "contractor", label: "Contractor's name or business", prefill: "candidate" },
      { key: "date", label: "Start date", type: "date", prefill: "startDate" },
      { key: "services", label: "The work", type: "textarea", placeholder: "Describe the project or services and what will be delivered" },
      { key: "rate", label: "Rate", placeholder: "e.g. $55 per hour, or $4,000 for the project" },
      { key: "invoicing", label: "Invoicing and payment", placeholder: "e.g. Invoiced monthly, paid within 15 days" },
      { key: "notice", label: "Notice to end it", placeholder: "e.g. 14 days" },
      { key: "signer", label: "Signing for the company", prefill: "owner" },
    ],
    body: `# Independent Contractor Agreement

This Agreement is between {{company}} (the "Company") and {{contractor}} (the "Contractor"), starting {{date}}.

## 1. The work
The Contractor will provide the following services: {{services}}

## 2. Payment
The Company will pay {{rate}}. {{invoicing}}. The Contractor is responsible for their own taxes, and the Company will issue a Form 1099 where required. The Contractor is not eligible for employee benefits.

## 3. Independence
The Contractor is an independent business, not an employee. The Contractor decides how, when and where to do the work, provides their own tools and equipment, may work for other clients, and is responsible for their own insurance and business expenses.

## 4. Confidentiality and work product
The Contractor will keep the Company's non-public information confidential and use it only for this work. Work product created for the Company under this Agreement belongs to the Company once paid for.

## 5. Ending the agreement
Either party may end this Agreement with {{notice}} written notice. The Company will pay for work properly done up to that date.

## 6. General
This Agreement is governed by the laws of the State of {{state}}. It is the entire agreement between the parties and can only be changed in writing.

SIGN: {{contractor}}, Contractor
SIGN: {{signer}}, for {{company}}`,
  },
  {
    slug: "interview-scorecard",
    title: "Interview scorecard",
    blurb: "Score every candidate the same way, so the decision is fair and easy.",
    when: "Print one per interview. Fill it in right after, before you compare notes.",
    fields: [
      { key: "candidate", label: "Candidate", prefill: "candidate" },
      { key: "job_title", label: "Role", prefill: "jobTitle" },
      { key: "interviewer", label: "Interviewer", prefill: "owner" },
      { key: "date", label: "Date", type: "date", prefill: "today" },
      { key: "must1", label: "Must-have #1", placeholder: "e.g. Keeps a schedule of 30+ jobs organized" },
      { key: "must2", label: "Must-have #2", placeholder: "e.g. Calm and clear with upset customers" },
      { key: "must3", label: "Must-have #3", placeholder: "e.g. Comfortable with QuickBooks" },
    ],
    body: `# Interview Scorecard
Candidate: {{candidate}}
Role: {{job_title}}
Interviewer: {{interviewer}}, {{date}}

Score each line 1 to 4: 1 = no evidence, 2 = some, 3 = solid, 4 = outstanding. Write down what they said that earned the score.

## The must-haves for this role
[ ] {{must1}}   Score: ___   Evidence: ______________________
[ ] {{must2}}   Score: ___   Evidence: ______________________
[ ] {{must3}}   Score: ___   Evidence: ______________________

## How they work
[ ] Fit with the work this role really involves (their profile shows their natural strengths)   Score: ___
[ ] Takes ownership: examples of following through without being chased   Score: ___
[ ] Communication: clear, honest, listens   Score: ___
[ ] Learns fast: examples of picking up something new   Score: ___

## Questions that work well
- Walk me through a typical week in your last job. What did you enjoy most, and what drained you?
- Tell me about a time something went wrong. What did you do first?
- What would your last manager say you're best at? And what would they want you to work on?
- What would make this job a great fit for you a year from now?

## Decision
[ ] Strong yes   [ ] Yes   [ ] Not sure   [ ] No

Biggest strength: ______________________
Biggest concern: ______________________`,
  },
  {
    slug: "reference-check",
    title: "Reference check questions",
    blurb: "A 10-minute call script that gets you real answers, not polite ones.",
    when: "Call two references, ideally including a former direct manager, before you make the offer final.",
    fields: [
      { key: "candidate", label: "Candidate", prefill: "candidate" },
      { key: "job_title", label: "Role you're hiring for", prefill: "jobTitle" },
      { key: "reference", label: "Reference's name and company" },
      { key: "caller", label: "Called by", prefill: "owner" },
      { key: "date", label: "Date", type: "date", prefill: "today" },
    ],
    body: `# Reference Check
Candidate: {{candidate}}, for the role of {{job_title}}
Reference: {{reference}}
Called by {{caller}} on {{date}}

## Open the call
"Thanks for making time. {{candidate}} has applied to be our {{job_title}} and gave me your name. This will take about ten minutes and stays between us."

## Questions
- How do you know {{candidate}}, and for how long did you work together?
- What were they responsible for? What did they do especially well?
- If you could have them back on your team, would you? Why?
- What kind of manager or setting brings out their best?
- What's one thing they could get better at?
- How did they handle pressure, mistakes or a hard deadline?
- How reliable were they with time and attendance?
- Is there anything I should know that would help me manage them well?

## Listen for
- Hesitation, faint praise, or "they were fine" when you asked about rehiring.
- Specific stories. Real examples beat adjectives.

## Notes
______________________
______________________

Overall: [ ] Confident   [ ] Some concerns   [ ] Red flag`,
  },
  {
    slug: "first-90-days",
    title: "First 90 days plan",
    blurb: "A simple plan so your new hire knows what success looks like from day one.",
    when: "Fill it in before their first day and walk through it together in week one.",
    fields: [
      { key: "employee", label: "New hire", prefill: "candidate" },
      { key: "job_title", label: "Role", prefill: "jobTitle" },
      { key: "manager", label: "Manager", prefill: "owner" },
      { key: "start_date", label: "Start date", type: "date", prefill: "startDate" },
      { key: "goal30", label: "By day 30, they should…", type: "textarea", placeholder: "e.g. Know our customers, systems and pricing; handle scheduling with help" },
      { key: "goal60", label: "By day 60, they should…", type: "textarea", placeholder: "e.g. Run scheduling on their own; handle routine customer calls" },
      { key: "goal90", label: "By day 90, they should…", type: "textarea", placeholder: "e.g. Own the weekly schedule and suggest one improvement" },
    ],
    body: `# First 90 Days: {{employee}}
Role: {{job_title}}
Manager: {{manager}}
Start date: {{start_date}}

## Before day one
[ ] Offer letter signed and paperwork ready (I-9, W-4, state forms)
[ ] Desk, tools, email and system logins set up
[ ] Team told who's starting and what they'll do
[ ] First-week schedule planned, including lunch with the team

## Week one
[ ] Welcome and tour, meet everyone they'll work with
[ ] Walk through this plan together
[ ] Explain how we work: hours, communication, who to ask for what
[ ] Give them one small, real task they can finish this week

## Day 30
{{goal30}}
[ ] 30-day check-in: what's going well, what's confusing, what do they need?

## Day 60
{{goal60}}
[ ] 60-day check-in

## Day 90
{{goal90}}
[ ] 90-day review: celebrate wins, agree goals for the next quarter

## Every week
A 15-minute one-on-one. Ask: What went well? What got in your way? What do you need from me?`,
  },
];

export function getTemplate(slug: string) {
  return TEMPLATES.find((t) => t.slug === slug) ?? null;
}
