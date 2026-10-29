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
};
export function personOf(role: string) {
  const r = role.trim();
  return PERSON[r] ?? (r ? `${r.toLowerCase()} professional` : "professional");
}

const LEVEL_WORD: Record<string, string> = { beginner: "Up-and-coming", experienced: "Experienced", senior: "Seasoned" };
const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

// Headline ideas: short, warm and specific, never identifying.
export function headlineIdeas(role: string, code: string, level: string) {
  const r = role.trim();
  if (!r) return [];
  const d = describe(code);
  const who = personOf(r);
  const lvl = LEVEL_WORD[level];
  const ideas = [
    d ? `${d.name} for ${lc(r)} roles` : null,
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
};

// Quick reminders for writing a profile that works.
export const WRITING_TIPS = [
  "Describe, don't identify: no names, employers or schools.",
  "Use numbers where you can: how many, how much, how fast.",
  "Plain, warm words. Write how you'd describe them to a friend.",
  "Lead with what they're great at, not what they lack.",
];
