// Our own Strengths Assessment, built around the six kinds of work (the letters W I D G E T, the
// same ones staff enter on candidate profiles). The questions and wording are our own. The result
// is read by the rule in strengths.ts (TIERS): 1st and 2nd natural strengths, 3rd close behind,
// 4th in the middle (doable, closer to the bottom), 5th and 6th wear them down.

import { TRAITS, type Letter } from "./strengths";

export const LETTERS: Letter[] = ["W", "I", "D", "G", "E", "T"];
export { TRAITS };

export type Question = { id: string; lens: number; key: Letter; text: string; backup: boolean };
/** items: every answer by question id (1-5). extra: the backup questions asked, in order. */
export type Answers = { items: Record<string, number>; extra: string[] };
export type Result = {
  v: 3;
  order: Letter[]; // strongest first
  letters: string; // e.g. "DTEIWG"
  scores: Record<Letter, number>; // 0 to 100
  clear: boolean; // false when two kinds of work were too close to call
  asked: number;
};

// ---- The questions ------------------------------------------------------------------------------
// Version 3. Every question is answered on the same kind of five-step scale; there are no
// either/or choices. The same question is asked from five angles: how the work makes you feel,
// how you see yourself, how others see you, what you actually find yourself doing, and what a
// whole day of it would be like. That last angle is the honesty check: everyone likes helping,
// fewer want a whole day of it.
//
// 30 main questions (one per angle for each of the six kinds of work). When two kinds of work
// come out too close to call, up to 13 backup questions are asked about just those two, so 43 at
// most. Someone with a clear result finishes in about 34.
//
// The same questions and scoring live in the booking app (api/_lib/assessment.js) and in The
// Candidate Collection (this file). Change one, change both.

export const LENSES: { id: string; part: string; intro: string; prompt: string; scale: string[] }[] = [
  { id: 'energy', part: 'Your energy', intro: 'First, how different kinds of work make you feel. Think about your best days, not just your current job.', prompt: 'How does doing this make you feel?', scale: ['Drains me', 'Not really me', 'It’s okay', 'I enjoy it', 'Love it'] },
  { id: 'self', part: 'How you see yourself', intro: 'Now, how true each statement is of you. Be honest, not modest and not generous.', prompt: 'How true is this of you?', scale: ['Not me at all', 'A little', 'Somewhat', 'Mostly', 'That’s me'] },
  { id: 'others', part: 'How others see you', intro: 'Picture the people who know you best: family, friends, coworkers. What would they say?', prompt: 'People who know you well would say you…', scale: ['No way', 'Rarely', 'Sometimes', 'Often', 'Definitely'] },
  { id: 'life', part: 'What you actually do', intro: 'Not what you think you should do. What you really find yourself doing.', prompt: 'How often do you find yourself…', scale: ['Never', 'Rarely', 'Sometimes', 'Often', 'All the time'] },
  { id: 'day', part: 'A whole day of it', intro: 'Last angle. Imagine a whole workday made of just one thing.', prompt: 'If your whole workday was this, it would be…', scale: ['Exhausting', 'Draining', 'Fine', 'A good day', 'A great day'] }
];

// [main question, backup question] for each angle and kind of work.
const BANK: Record<string, Record<Letter, [string, string]>> = {
  energy: {
    W: ['Thinking about why things are done the way they are', 'Imagining where things could be in a few years'],
    I: ['Coming up with a brand-new idea or solution', 'Figuring out a new way when the old way isn’t working'],
    D: ['Hearing an idea and giving your honest take on it', 'Weighing a few options and helping choose the best one'],
    G: ['Getting people excited about a new plan', 'Getting a group moving when nobody’s taking the lead'],
    E: ['Helping someone else get their work done', 'Hearing “can you give me a hand?” and jumping in'],
    T: ['Taking care of the final details so something is fully done', 'Working through a to-do list until it’s empty']
  },
  self: {
    W: ['I’m always wondering if there’s a better way, even when things are working.', 'I enjoy questions that don’t have an easy answer.'],
    I: ['I have more ideas than I could ever use.', 'Starting from a blank page excites me.'],
    D: ['I can usually tell right away whether an idea will work.', 'My gut about people and plans is usually right.'],
    G: ['When a group is stuck, I’m the one who gets it going.', 'I like being the one who kicks things off.'],
    E: ['I’m happiest when someone tells me what they need and I can take care of it.', 'I get real satisfaction from making someone else’s plan work.'],
    T: ['I can’t rest until a task is completely finished.', 'Loose ends bother me until they’re tied up.']
  },
  others: {
    W: ['always ask “why?”', 'are a deep thinker'],
    I: ['are full of creative ideas', 'always have another idea'],
    D: ['give great advice', 'have good instincts about people and plans'],
    G: ['bring energy into a room and get people moving', 'can get people on board with a plan'],
    E: ['are the first to offer help', 'make other people’s work easier'],
    T: ['always follow through', 'are the one who makes sure things actually get finished']
  },
  life: {
    W: ['wondering about the bigger picture in the middle of a task', 'asking “why do we do it this way?”'],
    I: ['coming up with ideas nobody asked for', 'working out your own solution before anyone hands you one'],
    D: ['being asked “what do you think?”', 'catching the weak spot in a plan before it goes wrong'],
    G: ['rallying people, even when you’re not in charge', 'being the one who says “let’s go, let’s do this”'],
    E: ['putting your own work aside to help someone', 'noticing what someone needs before they ask'],
    T: ['going back to tie up loose ends others left behind', 'staying on a task until it’s completely done']
  },
  day: {
    W: ['Thinking, reading and reflecting on where things are going', 'Talking through big questions with no deadline'],
    I: ['Brainstorming and designing something from scratch', 'Sketching out new plans, ideas or designs'],
    D: ['Reviewing other people’s plans and giving feedback', 'Being the person everyone runs their decisions by'],
    G: ['Getting people fired up and moving on something new', 'Pitching a plan and getting people to sign on'],
    E: ['Taking care of whatever the people around you need', 'Helping teammates with their tasks'],
    T: ['Wrapping up projects down to the last detail', 'Checking task after task off the list']
  }
};

// The order inside each part, so the same kind of work never comes up twice in a row.
const ORDERS: Letter[][] = [['I','E','W','T','G','D'], ['G','D','T','W','E','I'], ['E','W','G','I','D','T'], ['I','T','D','E','W','G'], ['D','G','E','W','T','I']];

const LETTER_LIST: Letter[] = ['W', 'I', 'D', 'G', 'E', 'T'];
export const QUESTIONS: Question[] = [];
LENSES.forEach((lens, li) => {
  for (const key of LETTER_LIST) {
    BANK[lens.id][key].forEach((text, v) => QUESTIONS.push({ id: lens.id + '.' + key + v, lens: li, key, text, backup: v === 1 }));
  }
});
const BY_ID: Record<string, Question> = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));
export const ITEMS = LENSES.flatMap((lens, li) => ORDERS[li].map(key => BY_ID[lens.id + '.' + key + '0']));
export const MAX_EXTRA = 13;
export const TOTAL_MAX = ITEMS.length + MAX_EXTRA;
const SETTLED = 1.0; // how far apart two kinds of work must be (in measured uncertainty) to call it
const BACKUP_LENS_ORDER = [4, 0, 1, 3, 2]; // backups ask the whole-day angle first: the hardest to over-rate

export function questionById(id: string): Question | null { return BY_ID[id] || null; }
const okRating = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;

export function baseComplete(a: Answers | null | undefined): a is Answers {
  return !!a && typeof a === 'object' && !!a.items && ITEMS.every(q => okRating(a.items[q.id]));
}

// Each answer is compared to how the person answers within that same angle, so a generous or a
// strict rater still gets a true picture. Then each kind of work gets its average and how sure
// we are of it.
function stats(a: Answers) {
  const asked = ITEMS.concat((a.extra || []).map(id => BY_ID[id]).filter(Boolean)).filter(q => okRating(a.items[q.id]));
  const lensAvg = LENSES.map((_, li) => {
    const xs = asked.filter(q => q.lens === li).map(q => a.items[q.id]);
    return xs.length ? xs.reduce((x, y) => x + y, 0) / xs.length : 3;
  });
  const st = {} as Record<Letter, { m: number; se: number }>;
  for (const k of LETTER_LIST) {
    const xs = asked.filter(q => q.key === k).map(q => a.items[q.id] - lensAvg[q.lens]);
    const n = xs.length || 1;
    const m = xs.reduce((x, y) => x + y, 0) / n;
    const v = xs.reduce((x, y) => x + (y - m) ** 2, 0) / Math.max(1, xs.length - 1);
    st[k] = { m, se: Math.sqrt(Math.max(v, 0.5) / n) };
  }
  const order = [...LETTER_LIST].sort((x, y) => (st[y].m - st[x].m) || (LETTER_LIST.indexOf(x) - LETTER_LIST.indexOf(y)));
  // Every pair that sits on opposite sides of a dividing line (strengths | middle | drains),
  // closest first.
  const pairs: { z: number; a: Letter; b: Letter }[] = [];
  for (const cut of [2, 4]) {
    for (const hi of order.slice(cut - 2, cut)) for (const lo of order.slice(cut, cut + 2)) {
      pairs.push({ z: (st[hi].m - st[lo].m) / Math.hypot(st[hi].se, st[lo].se), a: hi, b: lo });
    }
  }
  pairs.sort((x, y) => x.z - y.z);
  const worst = pairs[0];
  return { st, order, worst, pairs };
}

// The next backup question, or null when the result is settled (or all 13 are used). Always
// about one of the two kinds of work that are closest across a dividing line.
export function nextExtra(a: Answers): string | null {
  const extra = a.extra || [];
  if (extra.length >= MAX_EXTRA) return null;
  const { st, pairs } = stats(a);
  const pick = (k: Letter) => {
    const used = extra.map(id => BY_ID[id]).filter(q => q && q.key === k).map(q => q.lens);
    const li = BACKUP_LENS_ORDER.find(l => !used.includes(l));
    return li === undefined ? null : LENSES[li].id + '.' + k + '1';
  };
  for (const p of pairs) {
    if (p.z >= SETTLED) break;
    const first = st[p.a].se >= st[p.b].se ? p.a : p.b;
    const second = first === p.a ? p.b : p.a;
    const id = pick(first) || pick(second);
    if (id) return id;
  }
  return null;
}

/** Everything the server needs before it will store a result. The backups are replayed, so a
 *  browser can't skip ahead or pick its own questions. */
export function validAnswers(a: unknown): a is Answers {
  if (!baseComplete(a as Answers)) return false;
  const ans = a as Answers;
  if (!Array.isArray(ans.extra) || ans.extra.length > MAX_EXTRA || !ans.extra.every((x) => typeof x === 'string')) return false;
  const extra = ans.extra;
  for (let i = 0; i < extra.length; i++) {
    if (nextExtra({ items: ans.items, extra: extra.slice(0, i) }) !== extra[i]) return false;
    if (!okRating(ans.items[extra[i]])) return false;
  }
  return nextExtra({ items: ans.items, extra }) === null;
}

export function score(a: Answers): Result {
  const { st, order, worst } = stats(a);
  const scores = {} as Record<Letter, number>;
  for (const k of LETTER_LIST) scores[k] = Math.max(0, Math.min(100, Math.round(50 + st[k].m * 25)));
  return { v: 3, order, letters: order.join(''), scores, clear: worst.z >= SETTLED, asked: ITEMS.length + (a.extra || []).length };
}

/** The pair that was too close to call, if any, for the results page. */
export function closeCall(a: Answers): [Letter, Letter] | null {
  const { worst } = stats(a);
  return worst.z >= SETTLED ? null : [worst.a, worst.b];
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

export type Summary = { top: string[]; close: string[]; okay: string[]; low: string[]; letters: string | null };

export function summarize(result: unknown): Summary | null {
  const x = result as { v?: number; order?: Letter[]; letters?: string; top?: string[]; next?: string[]; low?: string[] };
  if (!x) return null;
  if ((x.v === 2 || x.v === 3) && Array.isArray(x.order)) {
    const n = (ks: Letter[]) => ks.map((k) => TRAITS[k].label);
    return { top: n(x.order.slice(0, 2)), close: n(x.order.slice(2, 3)), okay: n(x.order.slice(3, 4)), low: n(x.order.slice(4, 6)), letters: x.letters ?? null };
  }
  if (Array.isArray(x.top)) {
    const n = (ks: string[] = []) => ks.map((k) => OLD_NAMES[k] ?? k);
    const next = n(x.next);
    return { top: n(x.top), close: next.slice(0, 1), okay: next.slice(1, 2), low: n(x.low), letters: null };
  }
  return null;
}
