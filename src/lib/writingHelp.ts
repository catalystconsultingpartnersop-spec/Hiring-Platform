import { lowerRole } from "./format";
import { describe, profileOf } from "./strengths";

// Words and ideas that help reps write strong, warm, anonymous profiles.

export const ROLE_LIST = [
  "Executive assistant",
  "Administrative",
  "Office manager",
  "Customer service",
  "Sales",
  "Sales support",
  "Account management",
  "Bookkeeping",
  "Accounting",
  "Operations",
  "Project management",
  "Estimating",
  "Marketing",
  "Social media",
  "Graphic design",
  "HR and recruiting",
  "Dispatch and logistics",
  "Purchasing",
  "Property management",
  "Site supervision",
  "Payroll",
  "Medical office and billing",
  "Medical assistant",
  "Nursing",
  "Home health and caregiving",
  "Special education teacher",
  "Classroom aide / paraprofessional",
  "ABA / behavior therapy",
  "Speech, OT and PT",
  "Therapist and counseling",
  "Social work",
  "Case management",
  "Teaching",
  "School administration",
  "IT and tech support",
  "Maintenance and trades",
  "Warehouse",
  "Driver",
];

export const INDUSTRY_LIST = [
  "Small business",
  "Construction",
  "Home improvement",
  "Real estate",
  "Property management",
  "Professional services",
  "Healthcare",
  "Retail",
  "E-commerce",
  "Manufacturing",
  "Logistics",
  "Nonprofit",
  "Education",
  "Hospitality",
  "Finance",
  "Insurance",
  "Technology",
  "Consumer products",
  "Mental health",
  "Special education",
  "Social services",
  "Home care",
  "Childcare",
  "Schools and yeshivas",
  "Legal",
  "Restaurants and food",
];

// Kinds of roles each top-two strength pairing tends to shine in.
const PAIR_ROLES: Record<string, string[]> = {
  WI: ["Marketing", "Project management", "Operations"],
  WD: ["Accounting", "Project management", "HR and recruiting"],
  WG: ["Sales", "Account management", "Marketing"],
  WE: ["Executive assistant", "Customer service", "Administrative", "HR and recruiting"],
  WT: ["Bookkeeping", "Accounting", "Estimating"],
  ID: ["Operations", "Estimating", "Project management"],
  IG: ["Sales", "Marketing", "Social media"],
  IE: ["Customer service", "Account management", "Graphic design"],
  IT: ["Operations", "Bookkeeping", "Project management"],
  DE: ["Executive assistant", "Office manager", "HR and recruiting", "Account management", "Sales support"],
  DG: ["Sales", "Site supervision", "Project management"],
  DT: ["Accounting", "Project management", "Operations", "Estimating"],
  GE: ["Account management", "Customer service", "Sales"],
  GT: ["Sales", "Project management", "Site supervision"],
  ET: ["Administrative", "Customer service", "Sales support", "Office manager", "Dispatch and logistics"],
};

const ORDER = "WIDGET";
export function suggestRoles(code: string) {
  const p = profileOf(code);
  if (p.primary.length < 2) return [];
  const key = [...p.primary].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).join("");
  return PAIR_ROLES[key] ?? [];
}

// "Bookkeeping" -> "bookkeeper", so drafts read naturally.
const PERSON: Record<string, string> = {
  "Executive assistant": "executive assistant",
  Administrative: "administrative professional",
  "Office manager": "office manager",
  "Customer service": "customer service pro",
  Sales: "salesperson",
  "Sales support": "sales support specialist",
  "Account management": "account manager",
  Bookkeeping: "bookkeeper",
  Accounting: "accountant",
  Operations: "operations pro",
  "Project management": "project manager",
  Estimating: "estimator",
  Marketing: "marketer",
  "Social media": "social media specialist",
  "Graphic design": "graphic designer",
  "HR and recruiting": "HR and recruiting pro",
  "Dispatch and logistics": "dispatcher",
  Purchasing: "buyer",
  "Property management": "property manager",
  "Site supervision": "site supervisor",
  "Payroll": "payroll specialist",
  "Medical office and billing": "medical office pro",
  "Medical assistant": "medical assistant",
  "Nursing": "nurse",
  "Home health and caregiving": "caregiver",
  "Special education teacher": "special education teacher",
  "Classroom aide / paraprofessional": "classroom aide",
  "ABA / behavior therapy": "behavior therapist",
  "Speech, OT and PT": "therapist",
  "Therapist and counseling": "counselor",
  "Social work": "social worker",
  "Case management": "case manager",
  "Teaching": "teacher",
  "School administration": "school administrator",
  "IT and tech support": "IT pro",
  "Maintenance and trades": "tradesperson",
  "Warehouse": "warehouse pro",
  "Driver": "driver",
};
export function personOf(role: string) {
  const r = role.trim();
  return PERSON[r] ?? (r ? `${lowerRole(r)} professional` : "professional");
}

const LEVEL_WORD: Record<string, string> = { beginner: "Up-and-coming", experienced: "Experienced", senior: "Seasoned" };

// Headline ideas: short, warm and specific, never identifying.
export function headlineIdeas(role: string, code: string, level: string) {
  const r = role.trim();
  if (!r) return [];
  const d = describe(code);
  const who = personOf(r);
  const lvl = LEVEL_WORD[level];
  const ideas = [
    d ? `${d.name} for ${lowerRole(r)} roles` : null,
    d ? `${lvl ? `${lvl} ${who}` : who} known for ${d.wiredFor[0]}` : null,
    d ? `${who} who brings ${d.wiredFor[1]}` : null,
    ROLE_HOOKS[r] ?? null,
    lvl ? `${lvl} ${who} ready for the next step` : `${who} ready to make an impact`,
  ];
  return [...new Set(ideas.filter((x): x is string => !!x))].map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

const ROLE_HOOKS: Record<string, string> = {
  "Executive assistant": "Executive assistant who runs a busy week like clockwork",
  Administrative: "Organized admin who keeps everything moving",
  "Office manager": "Office manager who makes the whole office run smoother",
  "Customer service": "Customer service pro who turns problems into loyal customers",
  Sales: "Salesperson who never lets a lead go cold",
  "Sales support": "Sales support star who keeps every deal on track",
  "Account management": "Account manager clients trust and stay with",
  Bookkeeping: "Bookkeeper who finds the mistake everyone else missed",
  Accounting: "Accountant who keeps the numbers clean and clear",
  Operations: "Operations pro who turns chaos into a checklist",
  "Project management": "Project manager who delivers on time and on budget",
  Estimating: "Estimator with a sharp eye for what a job really costs",
  Marketing: "Marketer with ideas to spare and the follow-through to ship them",
  "Social media": "Social media creator who builds a real following",
  "Graphic design": "Designer who makes a small brand look big",
  "HR and recruiting": "People person who helps teams hire and keep great staff",
  "Dispatch and logistics": "Dispatcher who keeps every truck and crew on schedule",
  Purchasing: "Buyer who gets the right price and the right delivery date",
  "Property management": "Property manager tenants and owners both trust",
  "Site supervision": "Site supervisor who keeps crews safe and on schedule",
  "Payroll": "Payroll pro who gets everyone paid right, every time",
  "Medical office and billing": "Medical office pro who keeps patients and claims moving",
  "Medical assistant": "Medical assistant patients feel safe with",
  "Nursing": "Nurse who brings calm and care to every shift",
  "Home health and caregiving": "Caregiver families trust with the people they love",
  "Special education teacher": "Special ed teacher who sees what each child can do",
  "Classroom aide / paraprofessional": "Classroom aide who keeps every child on track",
  "ABA / behavior therapy": "Behavior therapist who makes real progress with every child",
  "Speech, OT and PT": "Therapist who helps kids and adults reach new milestones",
  "Therapist and counseling": "Counselor people open up to",
  "Social work": "Social worker who gets people the help they need",
  "Case management": "Case manager who keeps every client's plan on track",
  "Teaching": "Teacher students remember",
  "School administration": "School administrator who keeps the whole building running",
  "IT and tech support": "IT pro who fixes it before you know it's broken",
  "Maintenance and trades": "Hands-on pro who can fix just about anything",
  "Warehouse": "Warehouse pro who keeps orders moving",
  "Driver": "Driver with a clean record and on-time deliveries",
};

// A first draft of the summary, from what the rep has filled in.
export function summaryDraft(o: { role: string; level: string; code: string; years?: string }) {
  const d = describe(o.code);
  const lvl = LEVEL_WORD[o.level];
  const r = personOf(o.role);
  const first = `${lvl ?? (/^[aeiou]/i.test(r) ? "An" : "A")} ${r}${o.years ? ` with ${o.years} years of experience` : ""}.`;
  const parts = [first.charAt(0).toUpperCase() + first.slice(1)];
  if (d) parts.push(d.line, `${d.thrives}`);
  parts.push("Looking for a role where [what they want next].");
  return parts.join(" ");
}

// Sentence starters a rep can tap to add to the summary.
export const SUMMARY_STARTERS = [
  "Known for ",
  "At their best when ",
  "Brings [number] years of ",
  "Comfortable with ",
  "Looking for a team that ",
  "Colleagues rely on them to ",
];

// Highlight ideas by role. Brackets are for the rep to fill in.
export const HIGHLIGHT_IDEAS: Record<string, string[]> = {
  "Executive assistant": [
    "Managed calendars, travel and inbox for a busy executive",
    "Kept [number] projects on track at the same time",
    "Trusted with confidential information and decisions",
    "Organized events and offsites for [number] people",
  ],
  Administrative: [
    "Ran the front office for a team of [number]",
    "Set up a filing system everyone actually uses",
    "Handled scheduling, billing and vendor calls",
  ],
  "Office manager": [
    "Made a [number]-person office run itself",
    "Cut supply and vendor costs by [percent]",
    "Onboarded new hires and kept the office humming",
  ],
  "Customer service": [
    "Handled [number] calls and emails a day with a smile",
    "Turned unhappy customers into repeat ones",
    "Known for calm under pressure",
  ],
  Sales: [
    "Grew a territory to [number] accounts in [time]",
    "Consistently hit [percent] of quota",
    "Comfortable on a job site and in a boardroom",
  ],
  "Sales support": [
    "Prepared quotes and proposals for a sales team of [number]",
    "Kept the CRM clean and every follow-up on time",
    "The go-to person for customers after the sale",
  ],
  "Account management": ["Kept [percent] of clients year over year", "Managed [number] accounts at once", "Turned small clients into big ones"],
  Bookkeeping: [
    "Kept the books for [number] small businesses",
    "Caught errors that saved [amount]",
    "Fluent in QuickBooks and month-end close",
  ],
  Accounting: ["Closed the books every month on time", "Prepared reports owners actually read", "Cleaned up years of messy records"],
  Operations: [
    "Built processes that cut turnaround time by [percent]",
    "Coordinated crews, vendors and schedules",
    "The person who makes sure nothing falls through the cracks",
  ],
  "Project management": ["Delivered [number] projects on time and budget", "Kept clients, crews and suppliers in sync", "Comfortable juggling many moving parts"],
  Estimating: ["Prepared estimates for jobs up to [amount]", "Known for accurate takeoffs", "Works closely with field teams"],
  Marketing: ["Grew social following by [percent]", "Ran campaigns from idea to launch", "Writes clearly and fast"],
  "Payroll": ["Ran payroll for [number] employees", "Never missed a pay date", "Handles tax filings and benefits deductions"],
  "Medical office and billing": ["Handled check-in, scheduling and insurance for a busy practice", "Cut claim denials by [percent]", "Calm and kind with patients on the phone"],
  "Medical assistant": ["Supported [number] providers in a busy practice", "Took vitals, histories and prepped exam rooms", "Keeps the schedule running on time"],
  "Nursing": ["[number] years in [setting]", "Trusted with complex patients", "Patients and families ask for them by name"],
  "Home health and caregiving": ["Cared for clients with [needs]", "Reliable, on time, every visit", "Patient, warm and observant"],
  "Special education teacher": ["Taught [grade] students with [needs]", "Wrote and ran IEPs", "Parents and therapists trust them"],
  "Classroom aide / paraprofessional": ["Supported [number] students in an inclusive classroom", "One-on-one support for a student with [needs]", "Patient and steady when things get hard"],
  "ABA / behavior therapy": ["Ran ABA sessions for [number] clients", "Tracked data and progress every session", "Works closely with families and BCBAs"],
  "Speech, OT and PT": ["Treated [number] clients a week", "Experienced with [population]", "Builds trust fast with clients and families"],
  "Therapist and counseling": ["Licensed as [license]", "Experienced with [issues]", "Warm, grounded and a great listener"],
  "Social work": ["Managed a caseload of [number]", "Connected families to services and benefits", "Steady in a crisis"],
  "Case management": ["Coordinated care for [number] clients", "Organized records and follow-ups", "Works well with agencies and providers"],
  "Teaching": ["Taught [subject] to [grade]", "Kept a classroom of [number] engaged", "Parents and staff trust them"],
  "School administration": ["Ran the office for a school of [number] students", "Handled admissions, scheduling and parents", "Organized and calm under pressure"],
  "IT and tech support": ["Supported [number] users", "Set up networks, devices and accounts", "Explains tech in plain English"],
  "Maintenance and trades": ["[number] years in [trade]", "Licensed or certified in [area]", "Takes pride in doing it right the first time"],
  "Warehouse": ["Picked and packed [number] orders a day", "Forklift certified", "Reliable and safety-minded"],
  "Driver": ["Clean driving record", "Licensed for [class]", "Knows the area like the back of their hand"],
};

// Quick reminders for writing a profile that works.
export const WRITING_TIPS = [
  "Describe, don't identify: no names, employers or schools.",
  "Use numbers where you can: how many, how much, how fast.",
  "Plain, warm words. Write how you'd describe them to a friend.",
  "Lead with what they're great at, not what they lack.",
];
