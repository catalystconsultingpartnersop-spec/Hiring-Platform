import type { PublicCandidate } from "./db";

// Sample candidates shown while there are no real listings yet, so owners (and
// you) can see how browsing works. They disappear automatically as soon as the
// first real candidate is listed.

const day = (n: number) => new Date(Date.now() - n * 864e5).toISOString();
const id = (n: number) => `5a000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

type Sample = Omit<PublicCandidate, "id" | "status" | "listed_at" | "fee_override_cents"> & {
  n: number;
  daysAgo: number;
  fee?: number;
};

const RAW: Sample[] = [
  {
    n: 1,
    daysAgo: 1,
    headline: "Field sales closer who thrives on job sites, not in an office",
    role_category: "Sales",
    industry: "Construction",
    level: "experienced",
    location_region: "Northern New Jersey",
    work_mode: "on-site",
    salary_min: 85000,
    salary_max: 100000,
    strengths: [],
    working_genius: "GTDEIW",
    summary:
      "Twelve years selling building materials to contractors. Happiest in a truck between job sites; drained by a desk all day. Builds the kind of trust where foremen call him first when a supplier lets them down.",
    highlights: [
      "Rebuilt a dormant territory to 40 active accounts in 18 months",
      "Kept every major contractor through two years of supply shortages",
      "Comfortable on a scaffold and in a boardroom",
    ],
  },
  {
    n: 2,
    daysAgo: 2,
    headline: "Bookkeeper who finds the $3,000 mistake everyone else missed",
    role_category: "Bookkeeping",
    industry: "Small business",
    level: "experienced",
    location_region: "Brooklyn, NY",
    work_mode: "hybrid",
    salary_min: 62000,
    salary_max: 72000,
    strengths: [],
    working_genius: "DTWEIG",
    summary:
      "Eight years keeping the books for retail and service businesses with 10 to 60 employees. Reconciles everything, every month, and explains the numbers to owners in plain English.",
    highlights: [
      "Caught duplicate vendor payments worth $41,000 in her first quarter at her last job",
      "Moved two companies from spreadsheets to QuickBooks Online",
      "Month-end close in four business days, every month",
    ],
  },
  {
    n: 3,
    daysAgo: 3,
    headline: "Executive assistant who runs a CEO's week like a control tower",
    role_category: "Executive assistant",
    industry: "Real estate",
    level: "senior",
    location_region: "Manhattan, NY",
    work_mode: "on-site",
    salary_min: 95000,
    salary_max: 115000,
    strengths: [],
    working_genius: "ETDGWI",
    summary:
      "Supported the founder of a 200-person development firm for six years. Owns the calendar, the inbox and the travel, and knows which meetings to quietly decline.",
    highlights: [
      "Planned board offsites in three countries without a single missed connection",
      "Cut the CEO's meeting load by a third in her first two months",
      "Trusted with confidential deal documents and family matters",
    ],
  },
  {
    n: 4,
    daysAgo: 4,
    headline: "Beginner with a head for numbers and a hunger to learn the trade",
    role_category: "Accounting",
    industry: "Any",
    level: "beginner",
    location_region: "Lakewood, NJ",
    work_mode: "flexible",
    salary_min: 42000,
    salary_max: 50000,
    strengths: [],
    working_genius: "WDITGE",
    summary:
      "Finishing an accounting certificate and ready for a first real job. Did the books for his family's store for two summers and liked it more than he expected. You'll need to train him, and he'll be worth it.",
    highlights: [
      "Built a cash-flow spreadsheet his family's store still uses",
      "Top of his evening accounting class",
      "Available to start immediately",
    ],
  },
  {
    n: 5,
    daysAgo: 5,
    headline: "Operations manager who turns chaos into a checklist",
    role_category: "Operations",
    industry: "Logistics",
    level: "senior",
    location_region: "Philadelphia area",
    work_mode: "on-site",
    salary_min: 105000,
    salary_max: 125000,
    strengths: [],
    working_genius: "TEDGWI",
    summary:
      "Ran warehouse operations for a regional distributor with 80 staff across two shifts. Loves the messy problem nobody else wants, then writes the process so it never happens again.",
    highlights: [
      "Took order accuracy from 94% to 99.6% in a year",
      "Cut overtime spending by $180,000 annually",
      "Trained three shift supervisors who were promoted from the floor",
    ],
  },
  {
    n: 6,
    daysAgo: 6,
    headline: "Inside sales rep who loves the phone and never lets a lead go cold",
    role_category: "Sales",
    industry: "Home improvement",
    level: "experienced",
    location_region: "Fairfield County, CT",
    work_mode: "hybrid",
    salary_min: 65000,
    salary_max: 80000,
    strengths: [],
    working_genius: "GETDIW",
    summary:
      "Five years booking in-home consultations for a windows and siding company. Makes 80 calls a day without sounding like it, and remembers every customer's dog's name.",
    highlights: [
      "Highest appointment-set rate on a team of 12, two years running",
      "Rebuilt the follow-up sequence that revived 300 stale leads",
      "Spanish and English",
    ],
  },
  {
    n: 7,
    daysAgo: 8,
    headline: "Office manager who makes a 30-person office run itself",
    role_category: "Office manager",
    industry: "Professional services",
    level: "experienced",
    location_region: "Westchester, NY",
    work_mode: "on-site",
    salary_min: 68000,
    salary_max: 78000,
    strengths: [],
    working_genius: "EDTWGI",
    summary:
      "Seven years as the person everyone goes to at a law firm: supplies, payroll inputs, onboarding, the broken printer and the birthday cake. People stay longer in offices she runs.",
    highlights: [
      "Onboarded 25 new hires with a process the partners still use",
      "Renegotiated vendor contracts and saved $22,000 a year",
      "Handled a full office move over one weekend",
    ],
  },
  {
    n: 8,
    daysAgo: 9,
    headline: "Marketing generalist with ideas to spare and the hands to make them",
    role_category: "Marketing",
    industry: "Consumer products",
    level: "experienced",
    location_region: "Remote, US",
    work_mode: "remote",
    salary_min: 70000,
    salary_max: 85000,
    strengths: [],
    working_genius: "IWGDET",
    summary:
      "Four years doing a bit of everything for small brands: email, social, product pages and the occasional photoshoot. Best paired with someone who loves the details she'd rather skip.",
    highlights: [
      "Grew an email list from 4,000 to 31,000 in a year",
      "Wrote product pages that lifted conversion 22%",
      "Comfortable with Shopify, Klaviyo and Canva",
    ],
  },
  {
    n: 9,
    daysAgo: 10,
    headline: "Customer service lead who turns angry callers into loyal customers",
    role_category: "Customer service",
    industry: "E-commerce",
    level: "experienced",
    location_region: "Remote, US",
    work_mode: "remote",
    salary_min: 55000,
    salary_max: 65000,
    strengths: [],
    working_genius: "EDGTIW",
    summary:
      "Led a six-person support team for an online retailer. Reads a frustrated email and knows exactly what the customer actually needs, then fixes the process that caused it.",
    highlights: [
      "Raised customer satisfaction from 82% to 95%",
      "Cut average response time from 19 hours to 3",
      "Wrote the support playbook the company still trains on",
    ],
  },
  {
    n: 10,
    daysAgo: 11,
    headline: "Beginner with a natural sales instinct who'd rather be talking than typing",
    role_category: "Sales",
    industry: "Any",
    level: "beginner",
    location_region: "Monsey, NY",
    work_mode: "on-site",
    salary_min: 45000,
    salary_max: 55000,
    strengths: [],
    working_genius: "GITDEW",
    summary:
      "Twenty-three, two years running his own small detailing business, and ready to sell for a company with a real product. Raw, coachable, and not afraid of the phone.",
    highlights: [
      "Built a detailing business to 60 repeat customers by word of mouth",
      "Sold the most raffle tickets in his community fundraiser three years running",
      "Wants commission-heavy pay",
    ],
  },
  {
    n: 11,
    daysAgo: 13,
    headline: "Controller who builds the finance function from scratch",
    role_category: "Accounting",
    industry: "Manufacturing",
    level: "senior",
    location_region: "Jerusalem area",
    work_mode: "hybrid",
    salary_min: 150000,
    salary_max: 185000,
    strengths: [],
    working_genius: "DWITGE",
    summary:
      "CPA with fifteen years in manufacturing finance across the US and Israel. Has twice been the first finance hire and left behind a team, a budget process and an audit with no findings.",
    highlights: [
      "Set up finance for a manufacturer growing from $8M to $40M revenue",
      "Led two clean audits and one acquisition due diligence",
      "Fluent in English and Hebrew; US GAAP and Israeli reporting",
    ],
    fee: 1200000,
  },
  {
    n: 12,
    daysAgo: 15,
    headline: "Project coordinator who keeps twelve moving parts from colliding",
    role_category: "Project management",
    industry: "Construction",
    level: "experienced",
    location_region: "Northern New Jersey",
    work_mode: "hybrid",
    salary_min: 72000,
    salary_max: 88000,
    strengths: [],
    working_genius: "TEDWGI",
    summary:
      "Six years coordinating residential and light commercial builds. Owns the schedule, the permits and the subcontractor calendar, and sends the update before anyone asks.",
    highlights: [
      "Coordinated 14 projects at once with no missed inspections",
      "Built the scheduling template the company uses on every job",
      "Procore and Buildertrend power user",
    ],
  },
];

export const SAMPLES: PublicCandidate[] = RAW.map((s) => ({
  id: id(s.n),
  status: "listed",
  headline: s.headline,
  role_category: s.role_category,
  industry: s.industry,
  level: s.level,
  location_region: s.location_region,
  work_mode: s.work_mode,
  salary_min: s.salary_min,
  salary_max: s.salary_max,
  strengths: s.strengths,
  working_genius: s.working_genius,
  summary: s.summary,
  highlights: s.highlights,
  fee_override_cents: s.fee ?? null,
  listed_at: day(s.daysAgo),
}));

export function isSampleId(candidateId: string) {
  return candidateId.startsWith("5a000000-0000-4000-8000-");
}
