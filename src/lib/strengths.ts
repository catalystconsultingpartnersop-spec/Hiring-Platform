// How a candidate works best, in plain business language, generated from their
// Working Genius result.
//
// The admin enters the result as the six letters in order, strongest first
// (e.g. "GTDEIW"): the first two are the candidate's main strength, the middle
// two are secondary, and the last two are the kinds of work that drain them.
// Owners never see the assessment's name, letters or terms; only the wording
// below, which is our own.

export const TRAITS = {
  W: {
    label: "Big-picture thinking",
    short: "Sees the bigger picture and asks the questions that matter",
    adds: "steps back to ask whether the work is pointed in the right direction",
    partner: "sets the bigger direction",
  },
  I: {
    label: "Fresh ideas",
    short: "Comes up with new ways to solve problems",
    adds: "brings fresh ideas when the usual approach isn't working",
    partner: "comes up with new approaches",
  },
  D: {
    label: "Sound judgment",
    short: "Has good instincts about what will and won't work",
    adds: "has a good feel for which ideas are worth pursuing",
    partner: "makes the judgment calls",
  },
  G: {
    label: "Getting people moving",
    short: "Rallies people and gets things started",
    adds: "can get others on board and moving when it counts",
    partner: "rallies the team and gets things started",
  },
  E: {
    label: "Supporting the team",
    short: "Notices what others need and helps them succeed",
    adds: "pitches in readily when a teammate needs a hand",
    partner: "gives day-to-day support and encouragement",
  },
  T: {
    label: "Finishing the job",
    short: "Drives work over the finish line",
    adds: "can push through the last details to get things done",
    partner: "drives the final details to completion",
  },
} as const;

export type Letter = keyof typeof TRAITS;
const ORDER: Letter[] = ["W", "I", "D", "G", "E", "T"];

type PairText = {
  name: string;
  line: string;
  wiredFor: [string, string, string];
  thrives: string;
};

// One entry for each possible top-two combination.
const PAIRS: Record<string, PairText> = {
  WI: {
    name: "Visionary",
    line: "Full of big questions and fresh ideas; at their best at the start of something new.",
    wiredFor: ["asking “what if?”", "dreaming up new approaches", "starting from a blank page"],
    thrives: "early-stage projects, strategy and product work, anywhere a fresh approach is needed",
  },
  WD: {
    name: "Thoughtful advisor",
    line: "Reflective and wise; gives careful, well-reasoned advice and notices what others miss.",
    wiredFor: ["thinking things through", "giving wise counsel", "spotting what others miss"],
    thrives: "advisory, planning and quality roles where careful judgment matters more than speed",
  },
  WG: {
    name: "Inspiring big thinker",
    line: "Curious and energetic; gets people excited about where things could go.",
    wiredFor: ["big-picture enthusiasm", "getting people excited about ideas", "opening new doors"],
    thrives: "roles that mix vision and people, like business development, partnerships and team culture",
  },
  WE: {
    name: "Considerate supporter",
    line: "Quietly tuned in to what people need; steady, loyal and thoughtful.",
    wiredFor: ["thoughtful support", "anticipating what people need", "being the steady presence"],
    thrives: "supportive roles on close-knit teams where care and loyalty are valued",
  },
  WT: {
    name: "Careful, steady doer",
    line: "Thorough and dependable, with real depth behind the work.",
    wiredFor: ["careful, thorough work", "steady reliability", "getting it right the first time"],
    thrives: "detail-heavy work with room to think, like compliance, research and analysis",
  },
  ID: {
    name: "Practical problem-solver",
    line: "Comes up with ideas and has the instinct to pick the ones that will actually work.",
    wiredFor: ["solving real problems", "practical creativity", "knowing which idea will work"],
    thrives: "problem-solving roles like operations improvement, estimating, product and troubleshooting",
  },
  IG: {
    name: "Idea champion",
    line: "Dreams up new ideas and gets everyone else excited about them.",
    wiredFor: ["selling new ideas", "infectious enthusiasm", "turning a concept into buy-in"],
    thrives: "sales, marketing and launch roles where something new needs a champion",
  },
  IE: {
    name: "Flexible creator",
    line: "Designs solutions around what people actually need, and adapts as those needs change.",
    wiredFor: ["designing around people's needs", "flexible problem-solving", "adapting on the fly"],
    thrives: "client-facing roles that change with each customer, and improving how service is delivered",
  },
  IT: {
    name: "Systems builder",
    line: "Invents a better way of doing things, then builds it properly so it lasts.",
    wiredFor: ["building systems that last", "precise planning", "turning ideas into working processes"],
    thrives: "building and improving processes, like operations, systems, setting up the books or engineering",
  },
  DE: {
    name: "Trusted right hand",
    line: "Reads people and situations well and gives exactly the help that's needed.",
    wiredFor: ["reading people", "the right help at the right time", "being a trusted sounding board"],
    thrives: "right-hand roles like executive assistant, office manager, HR and client relationships",
  },
  DG: {
    name: "Decisive leader",
    line: "Sizes up a situation quickly, makes the call, and gets people moving on it.",
    wiredFor: ["quick, confident decisions", "rallying people around a plan", "taking charge in the moment"],
    thrives: "leadership and field roles where fast calls and momentum matter, like sales management or site supervision",
  },
  DT: {
    name: "Sharp finisher",
    line: "Makes good calls and sees them through to completion, with practical urgency.",
    wiredFor: ["good calls made quickly", "focused execution", "practical urgency"],
    thrives: "roles that own clear outcomes, like project coordination, accounting and operations",
  },
  GE: {
    name: "Team energizer",
    line: "Encourages and lifts people; brings momentum and a positive mood to any team.",
    wiredFor: ["lifting team spirit", "encouraging others", "building relationships"],
    thrives: "people-centered roles like account management, customer success and leading a team",
  },
  GT: {
    name: "Driver",
    line: "Pushes the team, pitches in personally, and makes sure deadlines are met.",
    wiredFor: ["driving deadlines", "holding people accountable", "rolling up their sleeves"],
    thrives: "roles that need someone to push, like sales, project management and production supervision",
  },
  ET: {
    name: "Dependable finisher",
    line: "Responsive and committed; steps up when something is needed and follows through every time.",
    wiredFor: ["dependable follow-through", "stepping up when needed", "keeping every commitment"],
    thrives: "roles where reliability is everything, like administration, operations support and customer service",
  },
};

const NAME_TO_LETTER: Record<string, Letter> = {
  wonder: "W",
  invention: "I",
  discernment: "D",
  galvanizing: "G",
  enablement: "E",
  tenacity: "T",
};

// Accepts "GTDEIW", "GT/DE/IW", "GT DE IW" or names like "Galvanizing, Tenacity, ...".
export function parseResult(raw: string | null | undefined): Letter[] {
  if (!raw) return [];
  const words = raw.toLowerCase().match(/[a-z]+/g) ?? [];
  const fromNames = words.map((w) => NAME_TO_LETTER[w]).filter(Boolean) as Letter[];
  const letters = fromNames.length
    ? fromNames
    : (raw.toUpperCase().replace(/[^WIDGET]/g, "").split("") as Letter[]);
  const seen = new Set<Letter>();
  return letters.filter((l) => !seen.has(l) && seen.add(l));
}

function pairKey(a: Letter, b: Letter) {
  return [a, b].sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y)).join("");
}

export type Profile = {
  primary: Letter[];
  secondary: Letter[];
  draining: Letter[];
  type: PairText | null;
};

export function profileOf(raw: string | null | undefined): Profile {
  const l = parseResult(raw);
  const primary = l.slice(0, 2);
  const secondary = l.slice(2, 4);
  const draining = l.length === 6 ? l.slice(4, 6) : [];
  const type = primary.length === 2 ? PAIRS[pairKey(primary[0], primary[1])] ?? null : null;
  return { primary, secondary, draining, type };
}

const joinAnd = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}` : xs[0] ?? "");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// The words shown to owners, all generated from the result.
export function describe(raw: string | null | undefined) {
  const p = profileOf(raw);
  if (!p.type) return null;
  return {
    name: p.type.name,
    line: p.type.line,
    wiredFor: [...p.type.wiredFor],
    thrives: `Thrives in ${p.type.thrives}.`,
    alsoBrings: p.secondary.length ? `${cap(joinAnd(p.secondary.map((l) => TRAITS[l].adds)))}.` : null,
    bestAlongside: p.draining.length
      ? `Does their best work on a team with someone who ${joinAnd(p.draining.map((l) => TRAITS[l].partner))}.`
      : null,
  };
}

// "Wired for" words: the admin's own words if they wrote any, otherwise the
// generated ones.
export function wiredFor(c: { strengths: string[]; working_genius: string | null }) {
  if (c.strengths.length) return c.strengths;
  return describe(c.working_genius)?.wiredFor ?? [];
}

export const TRAIT_LIST = ORDER.map((k) => ({ key: k, ...TRAITS[k] }));

// A starting headline when staff don't write one, e.g. "Sharp finisher for
// estimating roles".
export function suggestedHeadline(role: string, raw: string | null | undefined) {
  const d = describe(raw);
  const r = role.trim().toLowerCase();
  return d ? `${cap(r)} · ${d.name.toLowerCase()}` : `${cap(role.trim())}`;
}
