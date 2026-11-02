// The "product picture" for an anonymous candidate: an illustrated cover in the
// colors and icon of their kind of work, so the catalog scans like a store
// shelf without ever showing who someone is.

type Family = { key: string; bg: string; fg: string; icon: React.ReactNode };

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const ICONS = {
  numbers: (
    <g {...S}>
      <rect x="5" y="2.5" width="14" height="19" rx="2.2" />
      <rect x="8" y="5.5" width="8" height="4" rx="0.8" />
      <circle cx="9" cy="13" r="0.6" fill="currentColor" />
      <circle cx="12" cy="13" r="0.6" fill="currentColor" />
      <circle cx="15" cy="13" r="0.6" fill="currentColor" />
      <circle cx="9" cy="16.5" r="0.6" fill="currentColor" />
      <circle cx="12" cy="16.5" r="0.6" fill="currentColor" />
      <path d="M15 15.6v2" />
    </g>
  ),
  sales: (
    <g {...S}>
      <path d="M3 17l5.5-5.5 4 4L21 7" />
      <path d="M15 7h6v6" />
      <path d="M3 21h18" />
    </g>
  ),
  admin: (
    <g {...S}>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M3.5 9h17M8 2.5v4M16 2.5v4" />
      <path d="M8 13.5l2.5 2.5L16 11" />
    </g>
  ),
  service: (
    <g {...S}>
      <path d="M20 12a7.5 7.5 0 0 1-11 6.6L4 20l1.4-4.4A7.5 7.5 0 1 1 20 12z" />
      <path d="M9 11.5h.01M12.5 11.5h.01M16 11.5h.01" strokeWidth="2.4" />
    </g>
  ),
  ops: (
    <g {...S}>
      <rect x="2.5" y="9" width="5" height="5" rx="1" />
      <rect x="16.5" y="3.5" width="5" height="5" rx="1" />
      <rect x="16.5" y="15.5" width="5" height="5" rx="1" />
      <path d="M7.5 11.5h4.5M12 6v12M12 6h4.5M12 18h4.5" />
    </g>
  ),
  creative: (
    <g {...S}>
      <path d="M3.5 10v4a1 1 0 0 0 1 1H7l6 4.5v-15L7 9H4.5a1 1 0 0 0-1 1z" />
      <path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" />
    </g>
  ),
  people: (
    <g {...S}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c.6-3.4 3-5.5 6-5.5s5.4 2.1 6 5.5" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M16.2 14.6c2.3.2 4.1 2 4.6 4.9" />
    </g>
  ),
  building: (
    <g {...S}>
      <path d="M3 21h18" />
      <path d="M5 21V9l7-5 7 5v12" />
      <path d="M9.5 21v-5h5v5M9 11h.01M15 11h.01" strokeWidth="1.8" />
    </g>
  ),
  care: (
    <g {...S}>
      <path d="M12 20.5s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9c0 5.6-7.5 10-7.5 10z" />
      <path d="M12 10.5v5M9.5 13h5" />
    </g>
  ),
  school: (
    <g {...S}>
      <path d="M2.5 9L12 4.5 21.5 9 12 13.5z" />
      <path d="M6.5 11v4.5c1.5 1.5 3.5 2.2 5.5 2.2s4-.7 5.5-2.2V11M21.5 9v5" />
    </g>
  ),
  mind: (
    <g {...S}>
      <path d="M20 12a7.5 7.5 0 0 1-11 6.6L4 20l1.4-4.4A7.5 7.5 0 1 1 20 12z" />
      <path d="M12 15.5s-3.2-1.9-3.2-4.2a1.8 1.8 0 0 1 3.2-1.1 1.8 1.8 0 0 1 3.2 1.1c0 2.3-3.2 4.2-3.2 4.2z" />
    </g>
  ),
  tech: (
    <g {...S}>
      <rect x="3" y="4.5" width="18" height="12" rx="1.8" />
      <path d="M8.5 20h7M12 16.5V20M9 9.5l-2 1.5 2 1.5M15 9.5l2 1.5-2 1.5" />
    </g>
  ),
  tools: (
    <g {...S}>
      <path d="M14.5 6.5a4 4 0 0 0-5.3 5.1L3.5 17.3a1.7 1.7 0 0 0 2.4 2.4l5.7-5.7a4 4 0 0 0 5.1-5.3l-2.4 2.4-2.1-.5-.5-2.1z" />
    </g>
  ),
  star: (
    <g {...S}>
      <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" />
    </g>
  ),
};

const FAMILIES: Record<string, Family> = {
  numbers: { key: "numbers", bg: "#e3f0e7", fg: "#2f6b47", icon: ICONS.numbers },
  sales: { key: "sales", bg: "#ffeec2", fg: "#8a5a00", icon: ICONS.sales },
  admin: { key: "admin", bg: "#e4eaf8", fg: "#2f4f9a", icon: ICONS.admin },
  service: { key: "service", bg: "#ddf1f0", fg: "#1f6b68", icon: ICONS.service },
  ops: { key: "ops", bg: "#ece4f7", fg: "#5e3d96", icon: ICONS.ops },
  creative: { key: "creative", bg: "#fbe5d9", fg: "#a8431a", icon: ICONS.creative },
  people: { key: "people", bg: "#f8e1e8", fg: "#9b2f55", icon: ICONS.people },
  building: { key: "building", bg: "#efe7dc", fg: "#6e4d2a", icon: ICONS.building },
  care: { key: "care", bg: "#ddf1f0", fg: "#1f6b68", icon: ICONS.care },
  school: { key: "school", bg: "#e4eaf8", fg: "#2f4f9a", icon: ICONS.school },
  mind: { key: "mind", bg: "#ece4f7", fg: "#5e3d96", icon: ICONS.mind },
  tech: { key: "tech", bg: "#e6edf2", fg: "#2d4a63", icon: ICONS.tech },
  tools: { key: "tools", bg: "#efe7dc", fg: "#6e4d2a", icon: ICONS.tools },
  other: { key: "other", bg: "#eef1f6", fg: "#17213a", icon: ICONS.star },
};

const ROLE_FAMILY: Record<string, string> = {
  Bookkeeping: "numbers",
  Accounting: "numbers",
  Estimating: "numbers",
  Purchasing: "numbers",
  Sales: "sales",
  "Sales support": "sales",
  "Account management": "sales",
  "Executive assistant": "admin",
  Administrative: "admin",
  "Office manager": "admin",
  "Customer service": "service",
  Operations: "ops",
  "Project management": "ops",
  "Dispatch and logistics": "ops",
  Marketing: "creative",
  "Social media": "creative",
  "Graphic design": "creative",
  "HR and recruiting": "people",
  "Property management": "building",
  "Site supervision": "building",
  Payroll: "numbers",
  "Medical office and billing": "care",
  "Medical assistant": "care",
  Nursing: "care",
  "Home health and caregiving": "care",
  "Special education teacher": "school",
  "Classroom aide / paraprofessional": "school",
  "ABA / behavior therapy": "mind",
  "Speech, OT and PT": "care",
  "Therapist and counseling": "mind",
  "Social work": "people",
  "Case management": "people",
  Teaching: "school",
  "School administration": "school",
  "IT and tech support": "tech",
  "Maintenance and trades": "tools",
  Warehouse: "ops",
  Driver: "ops",
};

// Typed-in roles ("Account Manager", "bookkeeper") still get the right picture.
const KEYWORDS: [RegExp, string][] = [
  [/book|account(ing|ant)|payroll|estimat|purchas|financ|billing/i, "numbers"],
  [/sales|account manag|business develop/i, "sales"],
  [/assistant|admin|office|reception|secretar/i, "admin"],
  [/customer|support|service/i, "service"],
  [/nurs|medical|health|care|clinic|therap(y|ist) (speech|occupational|physical)|speech|ot\b|pt\b/i, "care"],
  [/teach|school|educat|aide|para|tutor|special ed/i, "school"],
  [/counsel|therap|mental|aba|behavior|psych/i, "mind"],
  [/social work|case manag|hr\b|human resources|recruit/i, "people"],
  [/market|social media|design|content|brand/i, "creative"],
  [/operat|project|dispatch|logistic|warehouse|driver|deliver/i, "ops"],
  [/it\b|tech|software|developer|computer/i, "tech"],
  [/maint|trade|electric|plumb|hvac|carpent|mechanic/i, "tools"],
  [/property|site|construct|real estate/i, "building"],
];
export function familyOf(role: string | null | undefined): Family {
  const r = (role ?? "").trim();
  const exact = ROLE_FAMILY[r] ?? Object.entries(ROLE_FAMILY).find(([k]) => k.toLowerCase() === r.toLowerCase())?.[1];
  const fuzzy = exact ?? KEYWORDS.find(([re]) => re.test(r))?.[1];
  return FAMILIES[fuzzy ?? "other"];
}

// size "card" sits on top of a catalog card; "hero" opens a candidate's page.
export function RoleCover({
  role,
  label,
  size = "card",
  children,
}: {
  role: string | null | undefined;
  label?: string | null;
  size?: "card" | "hero";
  children?: React.ReactNode; // badges and buttons laid over the cover
}) {
  const f = familyOf(role);
  return (
    <div className={`cover cover-${size}`} style={{ background: f.bg, color: f.fg }}>
      <svg className="cover-pattern" aria-hidden="true" viewBox="0 0 120 60" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id={`dots-${f.key}`} width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="0.9" fill="currentColor" opacity="0.18" />
          </pattern>
        </defs>
        <rect width="120" height="60" fill={`url(#dots-${f.key})`} />
        <circle cx="96" cy="30" r="26" fill="currentColor" opacity="0.07" />
      </svg>
      <svg className="cover-icon" viewBox="0 0 24 24" aria-hidden="true">
        {f.icon}
      </svg>
      {label && <span className="cover-label">{label}</span>}
      {children}
    </div>
  );
}
