// Our own strengths assessment (pilot). An original model built around job fit:
// nine natural strengths plus three work-style preferences. Nothing here comes
// from any other assessment's questions, names or scoring.

export type Key = "connect" | "persuade" | "help" | "lead" | "organize" | "precision" | "solve" | "create" | "build";

export const STRENGTHS: Record<
  Key,
  { name: string; short: string; about: string; careers: string[]; drain: string }
> = {
  connect: {
    name: "Connecting",
    short: "Lights up around people",
    about: "You get energy from people. Conversations, new faces and relationships come naturally, and people feel comfortable around you.",
    careers: ["Customer service", "Front desk and reception", "Account management", "Hospitality", "Community and member relations"],
    drain: "long stretches alone with no one to talk to",
  },
  persuade: {
    name: "Persuading",
    short: "Wins people over",
    about: "You enjoy bringing people around to a yes. A good negotiation or a closed deal gives you a real charge, and a no just makes you try another way.",
    careers: ["Sales", "Business development", "Real estate", "Fundraising", "Recruiting"],
    drain: "selling, negotiating and asking people for a yes",
  },
  help: {
    name: "Caring",
    short: "Takes care of people",
    about: "You notice what people need and you're patient with them. Helping someone through a problem, and seeing them feel better, is what makes a day worth it.",
    careers: ["Patient and client care", "Customer support", "Teaching and coaching", "HR and people support", "Social services"],
    drain: "dealing with other people's needs and problems all day",
  },
  lead: {
    name: "Leading",
    short: "Takes charge",
    about: "When nobody is deciding, you step up. You're comfortable making the call, setting the direction and holding a team to it.",
    careers: ["Management", "Team lead", "Operations manager", "Project lead", "Running a shop or branch"],
    drain: "being in charge and making the tough calls",
  },
  organize: {
    name: "Organizing",
    short: "Keeps everything running",
    about: "You see the moving pieces and put them in order. Schedules, systems and plans make sense to you, and a messy situation is something to fix.",
    careers: ["Office manager", "Executive assistant", "Operations and logistics", "Dispatch and scheduling", "Event planning"],
    drain: "juggling schedules, systems and lots of moving pieces",
  },
  precision: {
    name: "Precision",
    short: "Gets it exactly right",
    about: "You care about accuracy. You catch the mistake others miss, you're careful with numbers and records, and you like doing things the right way.",
    careers: ["Bookkeeping and accounting", "Billing and payroll", "Compliance", "Quality control", "Records and data"],
    drain: "careful detail work with numbers, records and rules",
  },
  solve: {
    name: "Problem-solving",
    short: "Figures things out",
    about: "You want to know why something isn't working, and you don't let go until you do. Digging into a puzzle and finding the answer is satisfying for you.",
    careers: ["IT and tech support", "Analysis and research", "Troubleshooting and repair", "Engineering", "Systems and software"],
    drain: "digging into tricky problems and complicated systems",
  },
  create: {
    name: "Creating",
    short: "Makes something new",
    about: "You come up with ideas and like making things from scratch. You see how something could look, sound or work better, and you want to make it happen.",
    careers: ["Marketing", "Design", "Writing and content", "Social media", "Product development"],
    drain: "coming up with new ideas from a blank page",
  },
  build: {
    name: "Hands-on",
    short: "Works with their hands",
    about: "You'd rather be on your feet than at a desk. Working with tools, fixing and building things, and seeing real results at the end of the day suits you.",
    careers: ["Skilled trades", "Maintenance and repair", "Installation and field service", "Construction", "Warehouse and logistics"],
    drain: "physical, on-your-feet work with tools",
  },
};

export const KEYS = Object.keys(STRENGTHS) as Key[];

// Part 1: how they feel about each kind of work. Three per strength,
// interleaved so the same strength never comes twice in a row.
const RAW: [Key, string][] = [
  ["connect", "Striking up a conversation with someone you've never met"],
  ["persuade", "Convincing someone to say yes"],
  ["help", "Patiently helping someone who is confused or upset"],
  ["lead", "Taking charge when nobody else is deciding"],
  ["organize", "Setting up a schedule or system so everything runs smoothly"],
  ["precision", "Double-checking work for mistakes"],
  ["solve", "Figuring out why something isn't working"],
  ["create", "Coming up with an idea nobody has tried"],
  ["build", "Working with your hands or with tools"],

  ["connect", "Keeping in touch with lots of people and remembering what's going on in their lives"],
  ["persuade", "Negotiating a price or a deal"],
  ["help", "Taking care of other people's needs so they can do their best"],
  ["lead", "Telling a team what needs to happen and holding them to it"],
  ["organize", "Keeping track of many moving pieces at once"],
  ["precision", "Working carefully with numbers, records or paperwork"],
  ["solve", "Digging through information to find an answer"],
  ["create", "Designing, writing or making something from scratch"],
  ["build", "Being on your feet and moving around, not at a desk"],

  ["connect", "Being the friendly face people deal with all day"],
  ["persuade", "Hearing “no” and trying again a different way"],
  ["help", "Listening to someone's problem and making them feel heard"],
  ["lead", "Making a tough call and owning the result"],
  ["organize", "Putting a messy situation in order"],
  ["precision", "Following exact rules or steps so it's done right"],
  ["solve", "Learning how a complicated system works"],
  ["create", "Making something look, sound or work better than before"],
  ["build", "Fixing or building something you can see when you're done"],
];
export const ITEMS = RAW.map(([key, text], i) => ({ id: `q${i + 1}`, key, text }));

export const SCALE = [
  { v: 1, label: "Drains me" },
  { v: 2, label: "Not for me" },
  { v: 3, label: "It's okay" },
  { v: 4, label: "I enjoy it" },
  { v: 5, label: "Love it" },
];

// Part 2: which would you rather do? Choosing keeps everyone from rating everything 5.
const PAIRS_RAW: [Key, string, Key, string][] = [
  ["connect", "Chatting with customers all day", "precision", "Checking reports for errors"],
  ["persuade", "Closing a sale", "help", "Calming down an upset customer"],
  ["lead", "Running the team", "organize", "Running the schedule"],
  ["solve", "Cracking a tricky problem", "create", "Designing something new"],
  ["build", "Fixing something with your hands", "connect", "Meeting lots of new people"],
  ["precision", "Making sure every number is right", "create", "Coming up with a fresh idea"],
  ["help", "Supporting the team behind the scenes", "lead", "Leading the team from the front"],
  ["organize", "Organizing a messy office", "solve", "Finding out why the system keeps crashing"],
  ["persuade", "Pitching a new customer", "build", "Building or repairing something"],
  ["connect", "Being everyone's go-to friendly face", "lead", "Being the one who makes the decisions"],
  ["create", "Creating something new", "help", "Taking care of someone who needs help"],
  ["precision", "Getting the paperwork exactly right", "persuade", "Talking someone into a deal"],
  ["organize", "Keeping track of orders and deliveries", "build", "Being out on the job site"],
  ["solve", "Researching until you find the answer", "help", "Helping someone through a hard day"],
];
export const PAIRS = PAIRS_RAW.map(([a, at, b, bt], i) => ({ id: `p${i + 1}`, a, at, b, bt }));

// Part 3: work style. 1 = left side, 5 = right side.
export const STYLES = [
  { id: "s1", dim: "pace", left: "A steady, predictable day", right: "A fast day where anything can happen" },
  { id: "s2", dim: "setting", left: "Working mostly on my own", right: "Working with people all day" },
  { id: "s3", dim: "structure", left: "Clear instructions and a routine", right: "Freedom to figure it out my way" },
  { id: "s4", dim: "pace", left: "Time to do things carefully", right: "Quick decisions and lots of action" },
  { id: "s5", dim: "setting", left: "A quiet place to focus", right: "A busy, social place" },
  { id: "s6", dim: "structure", left: "The same kind of work each day", right: "Something different every day" },
] as const;

const STYLE_TEXT = {
  pace: ["a steady, careful pace", "a mix of steady and fast", "a fast pace with lots of action"],
  setting: ["working mostly on your own", "a mix of solo work and people", "being around people all day"],
  structure: ["clear routines and instructions", "some structure with room to think", "freedom and variety"],
} as const;

// Combinations of the top two that point somewhere specific.
const PAIR_ROLES: Record<string, string[]> = {
  "connect+persuade": ["Sales", "Account management", "Business development"],
  "connect+help": ["Client care", "Patient coordinator", "Customer success"],
  "connect+organize": ["Office manager", "Front office lead", "Event coordinator"],
  "help+organize": ["Executive assistant", "Office administrator", "Program coordinator"],
  "organize+precision": ["Bookkeeping", "Office administration", "Billing and payroll"],
  "lead+organize": ["Operations manager", "Office or branch manager", "Project manager"],
  "lead+persuade": ["Sales manager", "Business development lead", "Running your own business"],
  "precision+solve": ["Data and financial analysis", "Quality assurance", "Accounting"],
  "build+solve": ["Field technician", "Maintenance and repair", "Electrician or HVAC"],
  "create+persuade": ["Marketing", "Brand and social media", "Sales with a creative side"],
  "create+solve": ["Product development", "Web and software", "Design"],
  "build+lead": ["Crew lead or foreman", "Site supervisor", "Running a trade business"],
  "build+precision": ["Skilled trades", "Installation", "Inspection and quality"],
  "help+lead": ["Team lead", "Program manager", "School or clinic administration"],
  "connect+lead": ["Store or branch manager", "Team lead", "Community leadership"],
  "connect+create": ["Social media", "Events and marketing", "Community engagement"],
  "help+precision": ["Medical billing", "HR administration", "Benefits and claims"],
  "organize+solve": ["Operations and logistics", "IT administration", "Systems coordinator"],
};

export type Answers = { items: Record<string, number>; pairs: Record<string, Key>; styles: Record<string, number> };

export type Result = {
  ranked: { key: Key; score: number }[];
  top: Key[];
  next: Key[];
  low: Key[];
  roles: string[];
  style: { dim: keyof typeof STYLE_TEXT; value: number; text: string }[];
};

export function complete(a: Answers) {
  return ITEMS.every((q) => a.items[q.id] >= 1 && a.items[q.id] <= 5) && PAIRS.every((p) => a.pairs[p.id] === p.a || a.pairs[p.id] === p.b) && STYLES.every((s) => a.styles[s.id] >= 1 && a.styles[s.id] <= 5);
}

export function score(a: Answers): Result {
  const sum: Record<string, number> = {};
  const n: Record<string, number> = {};
  for (const q of ITEMS) {
    sum[q.key] = (sum[q.key] ?? 0) + (a.items[q.id] - 1) / 4;
    n[q.key] = (n[q.key] ?? 0) + 1;
  }
  const wins: Record<string, number> = {};
  const seen: Record<string, number> = {};
  for (const p of PAIRS) {
    seen[p.a] = (seen[p.a] ?? 0) + 1;
    seen[p.b] = (seen[p.b] ?? 0) + 1;
    const w = a.pairs[p.id];
    wins[w] = (wins[w] ?? 0) + 1;
  }
  // 60% how much they enjoy it, 40% what they picked when they had to choose.
  const ranked = KEYS.map((key) => ({
    key,
    score: Math.round(100 * (0.6 * (sum[key] / n[key]) + 0.4 * ((wins[key] ?? 0) / (seen[key] || 1)))),
  })).sort((x, y) => y.score - x.score);

  const top = ranked.slice(0, 2).map((r) => r.key);
  const pairKey = [...top].sort().join("+");
  const roles = PAIR_ROLES[pairKey] ?? [...STRENGTHS[top[0]].careers.slice(0, 2), STRENGTHS[top[1]].careers[0]];

  const dims = ["pace", "setting", "structure"] as const;
  const style = dims.map((dim) => {
    const vals = STYLES.filter((s) => s.dim === dim).map((s) => a.styles[s.id]);
    const value = vals.reduce((x, y) => x + y, 0) / vals.length;
    const text = STYLE_TEXT[dim][value < 2.5 ? 0 : value > 3.5 ? 2 : 1];
    return { dim, value, text };
  });

  return { ranked, top, next: ranked.slice(2, 4).map((r) => r.key), low: ranked.slice(-2).map((r) => r.key), roles, style };
}
