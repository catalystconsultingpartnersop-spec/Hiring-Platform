import { askAI } from "./callDraft";
import { db } from "./db";
import { hiddenMatches, pairKey } from "./matchHidden";
import { matchesFor, type Position } from "./matching";
import { matchableCandidates, openPositions, positionsReady } from "./positions";
import { getSetting, setSetting } from "./settings";
import { parseResult, TRAITS, type Letter } from "./strengths";

// The second look at a match. The first look compares facts (role, town, pay,
// level). This one asks what a person who knows the candidate would ask:
// knowing what they're like, would they do well in what this job is like day
// to day? It reads what we already have from the call, the rep's notes and the
// Strengths Assessment. Nothing for reps to fill in.

export type Verdict = "strong" | "good" | "no" | "paper";
export type Judged = { v: Verdict; why: string; ask?: string; at: string; sig: string };
type Store = Record<string, Judged>;
const KEY = "match_judged";

export async function judgedMatches(): Promise<Store> {
  return getSetting<Store>(KEY, {});
}

type Full = { id: string; full_name: string; headline: string | null; summary: string | null; highlights: string[] | null; full_profile: string | null; admin_notes: string | null; working_genius: string | null; role_category: string | null; also_roles: string[] | null; level: string | null; application: Record<string, string> | null };
const sigOf = (c: Full, p: Position) => `${(c.application?.memory ?? "").length}.${(c.admin_notes ?? "").length}.${(c.full_profile ?? "").length}.${(c.application?.rep_take ?? "").length}|${(p.description ?? "").length}.${(p.needs ?? "").length}.${p.title}`;

function about(c: Full) {
  const app = c.application ?? {};
  let card = "";
  try {
    const m = JSON.parse(app.memory ?? "{}") as { hook?: string; bullets?: string[]; quote?: string };
    card = [m.hook, ...(m.bullets ?? []), m.quote && `In their words: "${m.quote}"`].filter(Boolean).join("\n");
  } catch {}
  const l = parseResult(c.working_genius) as Letter[];
  const strengths = l.length === 6 ? `Strengths Assessment: most natural at ${l.slice(0, 2).map((x) => TRAITS[x].label).join(" and ")}; worn down by ${l.slice(4, 6).map((x) => TRAITS[x].label).join(" and ")}.` : "";
  const parts = [
    app.rep_take && `The rep who met them says: ${app.rep_take}`,
    card && `Team memory card:\n${card}`,
    c.admin_notes && `Team notes (includes notes from their call):\n${String(c.admin_notes).slice(0, 5000)}`,
    strengths,
    app.looking_for && `They say they're looking for: ${app.looking_for}`,
    c.full_profile && `Profile:\n${String(c.full_profile).slice(0, 2500)}`,
    c.summary && `Summary: ${c.summary}`,
  ].filter(Boolean) as string[];
  // How much we really know about what they're like (beyond a resume summary).
  const personal = [app.rep_take, card, c.admin_notes, strengths].filter(Boolean).length;
  return { text: parts.join("\n\n"), personal };
}

export async function judgePair(c: Full, p: Position): Promise<Judged> {
  const a = about(c);
  const at = new Date().toISOString();
  const sig = sigOf(c, p);
  if (!a.personal) return { v: "paper", why: "Matched on paper only. We don't know enough about what they're like yet.", at, sig };
  const prompt = `You help a small recruiting team decide whether to suggest a candidate for an open job. On paper (role, town, pay, level) they already line up. Your job is the part a recruiter who has MET the candidate would add: knowing what this person is like, would they do well in what this job is like day to day?

Think about the job's reality first, from its title, company and description: the pace (rushed or steady), how structured the day is (set routine or changing minute to minute), the setting (desk, store or shop floor, warehouse, out in the field, remote), how much time is spent with customers or strangers, and how much they'd be on their own.
Then think about the person, only from what is written below: their energy and pace, whether they like structure, where they've been comfortable, what they avoid, what wears them down, what they want next.

Example of the judgment we want: a calm, reserved person who likes a set routine and clear steps is NOT a fit for a busy food store where you run between the oven and the counter all day, even if the pay, town and "customer service" label all line up.

Be honest and specific. Do not flatter. Use only facts given. If what's written about the person doesn't tell you enough to judge the day-to-day fit, say so with verdict "paper".

Reply with only JSON:
{"verdict":"strong" | "good" | "no" | "paper",
 "why":"one plain sentence, under 170 characters, naming the person's trait and the job's reality that decide it",
 "ask":"one short thing worth checking with the candidate or the employer, or empty"}

THE JOB
Title: ${p.title}
Company: ${p.company ?? "not given"}
Where: ${[p.location, p.work_mode].filter(Boolean).join(", ") || "not given"}
Level: ${p.level ?? "not given"}
What they need: ${p.needs ?? "not given"}
Description: ${(p.description ?? "not given").slice(0, 4000)}

THE CANDIDATE: ${c.full_name}
${a.text}`;
  const { text } = await askAI(prompt);
  const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { verdict?: string; why?: string; ask?: string };
  const v = (["strong", "good", "no", "paper"].includes(String(j.verdict)) ? j.verdict : "paper") as Verdict;
  return { v, why: String(j.why ?? "").slice(0, 220), ask: String(j.ask ?? "").slice(0, 200) || undefined, at, sig };
}

// Judge the paper matches that haven't had their second look yet (or whose facts changed), a few at a time.
export async function judgePending(max = 4): Promise<{ judged: number; left: number }> {
  if (!process.env.ANTHROPIC_API_KEY || !(await positionsReady())) return { judged: 0, left: 0 };
  const [positions, cands, hidden, store] = await Promise.all([openPositions(), matchableCandidates(), hiddenMatches(), judgedMatches()]);
  const pairs: { p: Position; id: string }[] = [];
  for (const p of positions) for (const { c } of matchesFor(p, cands, 8)) if (!hidden[pairKey(p.id, c.id)]) pairs.push({ p, id: c.id });
  if (!pairs.length) return { judged: 0, left: 0 };
  const { data } = await db().from("candidates").select("id, full_name, headline, summary, highlights, full_profile, admin_notes, working_genius, role_category, also_roles, level, application").in("id", [...new Set(pairs.map((x) => x.id))]);
  const full = new Map(((data ?? []) as unknown as Full[]).map((c) => [c.id, c]));
  const todo = pairs.filter(({ p, id }) => full.has(id) && store[pairKey(p.id, id)]?.sig !== sigOf(full.get(id)!, p));
  const fresh: Store = {};
  for (const { p, id } of todo.slice(0, max)) {
    try {
      fresh[pairKey(p.id, id)] = await judgePair(full.get(id)!, p);
    } catch {}
  }
  const n = Object.keys(fresh).length;
  if (n) {
    // Re-read before saving so two runs at once don't wipe each other out; drop pairs for positions that closed.
    const open = new Set(positions.map((p) => p.id));
    const latest = await judgedMatches();
    await setSetting(KEY, Object.fromEntries(Object.entries({ ...latest, ...fresh }).filter(([k]) => open.has(k.split(":")[0]))));
  }
  return { judged: n, left: Math.max(0, todo.length - n) };
}

// For anything an owner sees or is emailed: only matches that passed the second look.
// (If the AI isn't set up at all, the paper match stands.)
export const passes = (j: Judged | undefined) => (j ? j.v !== "no" : !process.env.ANTHROPIC_API_KEY);
