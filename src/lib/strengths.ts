// How a candidate works best, in plain business language.
//
// Behind the scenes this comes from the candidate's Working Genius result,
// entered by the admin as the six letters in order (e.g. "WDGEIT"): the first
// two are their main strength, the middle two are secondary. Owners never see
// the assessment's name, letters or terms; only the wording below.

export const TRAITS = {
  W: { label: "Big-picture thinking", short: "Sees the bigger picture and asks the questions that matter" },
  I: { label: "Fresh ideas", short: "Comes up with new ways to solve problems" },
  D: { label: "Sound judgment", short: "Has good instincts about what will and won't work" },
  G: { label: "Getting people moving", short: "Rallies people and gets things started" },
  E: { label: "Supporting the team", short: "Notices what others need and helps them succeed" },
  T: { label: "Finishing the job", short: "Drives work over the finish line" },
} as const;

export type Letter = keyof typeof TRAITS;
const ORDER: Letter[] = ["W", "I", "D", "G", "E", "T"];

// Our own names for each top-two combination.
const PAIRS: Record<string, { name: string; line: string }> = {
  WI: { name: "Visionary", line: "Full of big questions and fresh ideas; at their best at the start of something new." },
  WD: { name: "Thoughtful advisor", line: "Reflective and wise; gives careful, well-reasoned advice." },
  WG: { name: "Inspiring big thinker", line: "Curious and energetic; gets people excited about where things could go." },
  WE: { name: "Considerate supporter", line: "Quietly tuned in to what people need; steady and loyal." },
  WT: { name: "Careful, steady doer", line: "Thorough and dependable, with real depth behind the work." },
  ID: { name: "Practical problem-solver", line: "Comes up with ideas and has the instinct to pick the ones that will work." },
  IG: { name: "Idea champion", line: "Dreams up new ideas and gets everyone else on board with them." },
  IE: { name: "Flexible creator", line: "Designs solutions around what people actually need." },
  IT: { name: "Systems builder", line: "Invents a better way of doing things, then builds it properly." },
  DE: { name: "Trusted right hand", line: "Reads people and situations well and gives exactly the help that's needed." },
  DG: { name: "Decisive leader", line: "Sizes up a situation fast and gets people moving on it." },
  DT: { name: "Sharp finisher", line: "Makes good calls and sees them through to completion." },
  GE: { name: "Team energizer", line: "Encourages and lifts people; brings momentum and a positive mood." },
  GT: { name: "Driver", line: "Pushes the team, pitches in, and makes sure deadlines are met." },
  ET: { name: "Dependable finisher", line: "Responsive and committed; steps up when needed and follows through." },
};

const NAME_TO_LETTER: Record<string, Letter> = {
  wonder: "W",
  invention: "I",
  discernment: "D",
  galvanizing: "G",
  enablement: "E",
  tenacity: "T",
};

// Accepts "WDGEIT", "WD/GE/IT", "WD GE IT" or names like "Wonder, Discernment, ...".
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
  type: { name: string; line: string } | null;
};

export function profileOf(raw: string | null | undefined): Profile {
  const l = parseResult(raw);
  const primary = l.slice(0, 2);
  const secondary = l.slice(2, 4);
  const type = primary.length === 2 ? PAIRS[pairKey(primary[0], primary[1])] ?? null : null;
  return { primary, secondary, type };
}

export const TRAIT_LIST = ORDER.map((k) => ({ key: k, ...TRAITS[k] }));
