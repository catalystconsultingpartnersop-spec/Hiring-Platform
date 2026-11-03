// Our own strengths assessment, built around the six kinds of work (the letters
// W I D G E T, the same ones staff enter on candidate profiles). The questions and
// wording are our own. The result is 2 natural strengths, 2 they can do well, and
// 2 that wear them down.
//
// 24 ratings (four different ways of asking about each kind of work), 9 "which
// would you rather" choices, then 10 more choices picked one at a time to settle
// whatever is still closest. 43 questions in all.

import { TRAITS, type Letter } from "./strengths";

export const LETTERS: Letter[] = ["W", "I", "D", "G", "E", "T"];
export { TRAITS };

// Part 1: how much energy each kind of work gives them. Four angles on each.
const RAW: [Letter, string][] = [
  ["W", "Stepping back to ask whether we're even doing the right thing"],
  ["I", "Coming up with a brand-new idea or solution"],
  ["D", "Hearing an idea and sensing right away whether it will work"],
  ["G", "Getting people excited about a new plan"],
  ["E", "Jumping in when someone asks for a hand"],
  ["T", "Pushing a project across the finish line"],
  ["I", "Being handed a problem nobody has solved yet"],
  ["T", "Taking care of the last details so it's fully done"],

  ["D", "Giving honest feedback that makes someone's plan better"],
  ["W", "Having quiet time to think about where things are heading"],
  ["E", "Helping make someone else's plan a success"],
  ["G", "Getting a stuck project moving again"],
  ["T", "Sticking with a task until it's complete, even when it gets boring"],
  ["I", "Brainstorming lots of different ways to do something"],
  ["W", "Wondering why something is done the way it is"],
  ["D", "Spotting what's off in a plan before it goes wrong"],

  ["G", "Rallying a group when energy is low"],
  ["E", "Noticing what a teammate needs and taking care of it"],
  ["W", "Noticing a need or an opportunity before anyone else sees it"],
  ["T", "Checking off a to-do list, one item at a time"],
  ["I", "Starting from a blank page"],
  ["D", "Being the one people ask, “What do you think of this?”"],
  ["E", "Being the person everyone can count on to help"],
  ["G", "Pushing people to stop talking and start doing"],
];
export const ITEMS = RAW.map(([key, text], i) => ({ id: `q${i + 1}`, key, text }));

export const SCALE = [
  { v: 1, label: "Drains me" },
  { v: 2, label: "Not for me" },
  { v: 3, label: "It's okay" },
  { v: 4, label: "I enjoy it" },
  { v: 5, label: "Love it" },
];

// Part 2: forced choices. Each kind of work comes up three times.
const PAIRS_RAW: [Letter, string, Letter, string][] = [
  ["W", "Thinking about where the business should go next", "D", "Judging which of three plans is best"],
  ["I", "Coming up with ideas", "T", "Getting things finished"],
  ["G", "Leading the charge on something new", "E", "Supporting the team behind the scenes"],
  ["W", "Reflecting on how things could be better", "T", "Finishing a project down to the last detail"],
  ["I", "Inventing a new way to solve a problem", "D", "Deciding which solution is the right one"],
  ["G", "Kicking off a project", "T", "Wrapping up a project"],
  ["D", "Giving advice on a big decision", "E", "Pitching in wherever help is needed"],
  ["W", "Pondering a big question", "G", "Getting people fired up to act"],
  ["I", "Designing something new", "E", "Helping a coworker get their work done"],
];
export const PAIRS = PAIRS_RAW.map(([a, at, b, bt], i) => ({ id: `p${i + 1}`, a, at, b, bt }));

// Part 3: short ways of saying each kind of work, for the follow-up choices.
export const SNIPPETS: Record<Letter, string[]> = {
  W: [
    "Thinking through the big questions",
    "Asking why we do it this way",
    "Imagining where things could go",
    "Taking time to reflect before acting",
    "Spotting a need nobody has noticed",
    "Questioning whether we have the right goal",
  ],
  I: [
    "Coming up with a new idea",
    "Inventing a fresh solution",
    "Starting something from scratch",
    "Brainstorming ten ways to do it",
    "Designing something original",
    "Finding a creative way around a problem",
  ],
  D: [
    "Judging which idea will work",
    "Giving honest feedback on a plan",
    "Trusting my gut on a decision",
    "Spotting the flaw in a plan",
    "Weighing the options and picking the best",
    "Being asked for my opinion",
  ],
  G: [
    "Getting people excited to start",
    "Rallying the team",
    "Kicking off something new",
    "Convincing people to take action",
    "Getting a stalled project moving",
    "Recruiting people to help",
  ],
  E: [
    "Helping someone with their task",
    "Supporting the team behind the scenes",
    "Saying yes when someone needs a hand",
    "Making someone else's plan work",
    "Taking care of what people need",
    "Being there when the team needs me",
  ],
  T: [
    "Finishing what we started",
    "Handling the final details",
    "Making sure everything is done right",
    "Pushing through to the deadline",
    "Crossing tasks off the list",
    "Seeing a project all the way through",
  ],
};

export const MAX_EXTRA = 10;
const CLEAR = 0.15; // a gap this big between two kinds of work is a settled answer

export type Extra = { a: Letter; ai: number; b: Letter; bi: number; pick: Letter };
export type Answers = { items: Record<string, number>; pairs: Record<string, Letter>; extra: Extra[] };

export type Result = {
  v: 2;
  order: Letter[]; // strongest first
  letters: string; // e.g. "DTEIWG"
  scores: Record<Letter, number>; // 0 to 100
  clear: boolean; // whether both dividing lines ended up settled
};

const isLetter = (x: unknown): x is Letter => typeof x === "string" && (LETTERS as string[]).includes(x);

export function baseComplete(a: Answers) {
  return ITEMS.every((q) => a.items[q.id] >= 1 && a.items[q.id] <= 5) && PAIRS.every((p) => a.pairs[p.id] === p.a || a.pairs[p.id] === p.b);
}

export function validExtra(extra: unknown): extra is Extra[] {
  return (
    Array.isArray(extra) &&
    extra.length <= MAX_EXTRA &&
    extra.every(
      (e: Extra) =>
        e &&
        isLetter(e.a) &&
        isLetter(e.b) &&
        e.a !== e.b &&
        (e.pick === e.a || e.pick === e.b) &&
        Number.isInteger(e.ai) &&
        Number.isInteger(e.bi) &&
        e.ai >= 0 &&
        e.ai < 6 &&
        e.bi >= 0 &&
        e.bi < 6,
    )
  );
}

// Mostly from how they rated each kind of work (against their own average, so someone
// who loves everything still gets a real answer), the rest from what they picked
// when they had to choose.
function raw(a: Answers): Record<Letter, number> {
  const all = ITEMS.map((q) => a.items[q.id] ?? 3);
  const avg = all.reduce((x, y) => x + y, 0) / all.length;
  const wins: Record<string, number> = {};
  const seen: Record<string, number> = {};
  const choices = [...PAIRS.map((p) => ({ a: p.a, b: p.b, pick: a.pairs[p.id] })), ...a.extra];
  for (const c of choices) {
    if (!c.pick) continue;
    seen[c.a] = (seen[c.a] ?? 0) + 1;
    seen[c.b] = (seen[c.b] ?? 0) + 1;
    wins[c.pick] = (wins[c.pick] ?? 0) + 1;
  }
  const out = {} as Record<Letter, number>;
  for (const k of LETTERS) {
    const mine = ITEMS.filter((q) => q.key === k).map((q) => a.items[q.id] ?? 3);
    const rating = Math.max(-1, Math.min(1, (mine.reduce((x, y) => x + y, 0) / mine.length - avg) / 2));
    const choice = seen[k] ? ((wins[k] ?? 0) / seen[k] - 0.5) * 2 : 0;
    out[k] = 0.6 * rating + 0.4 * choice;
  }
  return out;
}

function ranked(a: Answers) {
  const r = raw(a);
  return { r, order: [...LETTERS].sort((x, y) => r[y] - r[x]) };
}

// The two dividing lines that matter: strengths vs. middle, middle vs. drains.
function unsettled(a: Answers) {
  const { r, order } = ranked(a);
  const out: { a: Letter; b: Letter; gap: number }[] = [];
  for (const cut of [2, 4]) {
    for (const hi of order.slice(0, cut)) for (const lo of order.slice(cut)) out.push({ a: hi, b: lo, gap: r[hi] - r[lo] });
  }
  return out.sort((x, y) => x.gap - y.gap);
}

// The next follow-up question: always the closest call that's still left, so all ten
// go where they help most. Null once all ten are answered.
export function nextExtra(a: Answers): { a: Letter; ai: number; b: Letter; bi: number } | null {
  if (a.extra.length >= MAX_EXTRA) return null;
  const asked = (x: Letter, y: Letter) => a.extra.filter((e) => (e.a === x && e.b === y) || (e.a === y && e.b === x)).length;
  const close = unsettled(a);
  const open = close.filter((c) => c.gap < CLEAR);
  const pool = open.length ? open : close.slice(0, 3);
  // The closest call, but don't keep asking the same two over and over.
  const pick = [...pool].sort((x, y) => x.gap + asked(x.a, x.b) * 0.08 - (y.gap + asked(y.a, y.b) * 0.08))[0];
  const used = (k: Letter) => a.extra.flatMap((e) => (e.a === k ? [e.ai] : e.b === k ? [e.bi] : []));
  const fresh = (k: Letter) => {
    const u = used(k);
    for (let i = 0; i < 6; i++) if (!u.includes(i)) return i;
    return a.extra.length % 6;
  };
  // Alternate which side is shown first.
  const [x, y] = a.extra.length % 2 ? [pick.b, pick.a] : [pick.a, pick.b];
  return { a: x, ai: fresh(x), b: y, bi: fresh(y) };
}

export function score(a: Answers): Result {
  const { r, order } = ranked(a);
  const scores = {} as Record<Letter, number>;
  for (const k of LETTERS) scores[k] = Math.round((r[k] + 1) * 50);
  return { v: 2, order, letters: order.join(""), scores, clear: !unsettled(a).some((c) => c.gap < CLEAR) };
}

// ---- Showing saved results (older ones used a different, nine-strength model) ----

const OLD_NAMES: Record<string, string> = {
  connect: "Connecting",
  persuade: "Persuading",
  help: "Caring",
  lead: "Leading",
  organize: "Organizing",
  precision: "Precision",
  solve: "Problem-solving",
  create: "Creating",
  build: "Hands-on",
};

export type Summary = { top: string[]; mid: string[]; low: string[]; letters: string | null };

export function summarize(result: unknown): Summary | null {
  const x = result as Partial<Result> & { top?: string[]; next?: string[]; low?: string[] };
  if (!x) return null;
  if (x.v === 2 && Array.isArray(x.order)) {
    const n = (ks: Letter[]) => ks.map((k) => TRAITS[k].label);
    return { top: n(x.order.slice(0, 2)), mid: n(x.order.slice(2, 4)), low: n(x.order.slice(4, 6)), letters: x.letters ?? null };
  }
  if (Array.isArray(x.top)) {
    const n = (ks: string[] = []) => ks.map((k) => OLD_NAMES[k] ?? k);
    return { top: n(x.top), mid: n(x.next), low: n(x.low), letters: null };
  }
  return null;
}
