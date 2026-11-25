import { askAI } from "./callDraft";
import { db, logActivity } from "./db";
import { refCode, teamUrl } from "./format";
import { hiddenMatches, pairKey } from "./matchHidden";
import { matchesFor, type Match, type Position } from "./matching";
import { memoryOf } from "./memory";
import { companyCard, manualMatches, openingProfiles, type OpeningProfile } from "./openings";
import { effectiveReps } from "./reps";
import { getSetting, setSetting } from "./settings";
import { READING_RULE, resultInWords } from "./strengths";
import { sendText } from "./sms";
import { staffPhones } from "./staffPhones";

// Matching, done the way a recruiter who knows everyone would do it: the AI reads
// the opening's profile against every candidate's memory card, notes and strengths,
// and picks the best few with a plain reason and any warning. It also learns from
// the team ("not a fit" and why) and from what happened before (hires, passes).
// The old word-matching stays as a fallback for when the AI hasn't run yet.

export type AiPick = { id: string; fit: "strong" | "good"; why: string; flag?: string };
export type AiAlmost = { id: string; why: string; missing: string };
export type AiResult = { sig: string; at: string; list: AiPick[]; almost: AiAlmost[] };
type Store = Record<string, AiResult>;
const KEY = "ai_matches";
const TOLD = "ai_matches_told"; // pairs a rep was already texted about

export async function aiMatches(): Promise<Store> {
  return getSetting<Store>(KEY, {});
}

type Cand = {
  id: string;
  status: string;
  full_name: string;
  added_by: string | null;
  headline: string | null;
  role_category: string | null;
  also_roles: string[] | null;
  level: string | null;
  location_region: string | null;
  work_mode: string | null;
  salary_min: number | null;
  salary_max: number | null;
  summary: string | null;
  highlights: string[] | null;
  working_genius: string | null;
  admin_notes: string | null;
  application: Record<string, string> | null;
  updated_at: string | null;
};
const COLS = "id, status, full_name, added_by, headline, role_category, also_roles, level, location_region, work_mode, salary_min, salary_max, summary, highlights, working_genius, admin_notes, application, updated_at";

export async function matchPool(): Promise<{ listed: Cand[]; unlisted: Cand[] }> {
  const { data } = await db().from("candidates").select(COLS).in("status", ["listed", "draft", "applied"]);
  const all = (data ?? []) as Cand[];
  return { listed: all.filter((c) => c.status === "listed"), unlisted: all.filter((c) => c.status !== "listed") };
}

const money = (n: number | null) => (n ? `$${Math.round(n / 1000)}k` : "");
function brief(c: Cand, tag: string) {
  const app = c.application ?? {};
  const m = memoryOf(c);
  const lines = [
    `[${tag}] ${c.headline ?? ""}`.trim(),
    [c.role_category, ...(c.also_roles ?? [])].filter(Boolean).join(", "),
    [c.level, c.location_region, c.work_mode, [money(c.salary_min), money(c.salary_max)].filter(Boolean).join("–"), app.hours, app.available && `available: ${app.available}`].filter(Boolean).join(" · "),
    m.ready && m.hook,
    ...(m.ready ? m.bullets : (c.highlights ?? []).slice(0, 3)),
    m.good_for?.length ? `Good for: ${m.good_for.join(", ")}` : "",
    app.rep_take && `Rep: ${app.rep_take.slice(0, 400)}`,
    app.looking_for && `Wants: ${app.looking_for.slice(0, 200)}`,
    resultInWords(c.working_genius) && `Strengths Assessment: ${resultInWords(c.working_genius)}`,
    !m.ready && c.summary && c.summary.slice(0, 300),
  ];
  return lines.filter(Boolean).join("\n");
}

function hash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// What a match depends on: the opening, its profile, the candidates and the team's feedback.
function sigFor(p: Position, prof: OpeningProfile | undefined, pool: { listed: Cand[]; unlisted: Cand[] }, hiddenCount: number) {
  const cands = [...pool.listed, ...pool.unlisted].map((c) => `${c.id}${c.status[0]}${c.updated_at ?? ""}`).sort().join(",");
  return hash([p.title, p.company, p.location, p.salary_min, p.salary_max, p.description?.length, p.needs, prof?.at ?? "", cands, hiddenCount].join("|"));
}

type Lessons = { here: string[]; general: string[] };
async function lessonsFor(p: Position, byId: Map<string, Cand>): Promise<Lessons> {
  const hidden = await hiddenMatches();
  const { data: ps } = await db().from("positions").select("id, title, company");
  const pos = new Map((ps ?? []).map((x) => [x.id as string, x as { id: string; title: string; company: string | null }]));
  const here: string[] = [];
  const general: string[] = [];
  for (const [k, v] of Object.entries(hidden)) {
    const [pid, cid] = k.split(":");
    const c = byId.get(cid);
    const why = (v as { reason?: string }).reason;
    if (pid === p.id) here.push(`${c?.full_name ?? "Someone"}: not a fit${why ? ` (${why})` : ""}`);
    else if (why && c) general.push(`${c.role_category ?? "candidate"} for "${pos.get(pid)?.title ?? "a job"}": not a fit because ${why}`);
  }
  // People the team picked by hand for this opening: learn what they saw.
  for (const m of (await manualMatches())[p.id] ?? []) {
    const c = byId.get(m.id);
    if (c) here.push(`${m.by} on our team picked ${c.full_name} (${c.headline ?? c.role_category}) for this opening${m.why ? `: "${m.why}"` : ""}`);
  }
  // What this owner did before with our candidates: who they passed on (and why), who they hired.
  if (p.contact_email) {
    const { data: done } = await db().from("activity_log").select("action, details").eq("actor", `owner:${p.contact_email.toLowerCase()}`).in("action", ["hire_decided", "candidate_passed"]).order("at", { ascending: false }).limit(50);
    const byRef = new Map([...byId.values()].map((c) => [refCode(c.id), c]));
    for (const d of (done ?? []) as { action: string; details: Record<string, string> }[]) {
      const c = byRef.get(d.details.candidate ?? "");
      if (c) here.push(`This owner ${d.action === "candidate_passed" ? `passed on ${c.headline ?? c.role_category}${d.details.reason ? ` — "${d.details.reason}"` : ""}` : `hired ${c.headline ?? c.role_category}`}`);
    }
  }
  return { here: here.slice(0, 12), general: general.slice(-15) };
}

export async function runMatch(p: Position, pool?: { listed: Cand[]; unlisted: Cand[] }): Promise<AiResult | null> {
  pool ??= await matchPool();
  const prof = (await openingProfiles())[p.id];
  const card = await companyCard(p.company);
  const hidden = await hiddenMatches();
  const listed = pool.listed.filter((c) => !hidden[pairKey(p.id, c.id)]);
  const unlisted = pool.unlisted.filter((c) => (c.headline || c.summary || c.application?.rep_take || c.application?.looking_for) && !hidden[pairKey(p.id, c.id)]);
  const byId = new Map([...pool.listed, ...pool.unlisted].map((c) => [c.id, c]));
  const lessons = await lessonsFor(p, byId);
  const hiddenCount = Object.keys(hidden).filter((k) => k.startsWith(`${p.id}:`)).length;
  const sig = sigFor(p, prof, pool, hiddenCount);
  if (!listed.length && !unlisted.length) return null;

  const opening = [
    `Title: ${p.title}`,
    p.company && `Company: ${p.company}`,
    p.location && `Location: ${p.location}${p.work_mode ? ` (${p.work_mode})` : ""}`,
    (p.salary_min || p.salary_max) && `Pay: ${money(p.salary_min)}–${money(p.salary_max)}`,
    p.level && `Level: ${p.level}`,
    p.starts && `Start: ${p.starts}`,
    p.needs && `Needs most: ${p.needs}`,
    prof?.job && `The job: ${prof.job}`,
    prof?.day && `The day: ${prof.day}`,
    prof?.thrives?.length && `Who does well: ${prof.thrives.join("; ")}`,
    prof?.hours && `Hours: ${prof.hours}`,
    !prof?.job && p.description && `About: ${p.description.slice(0, 1500)}`,
    card && `About the company: ${card.about}`,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `You are the matchmaker for a small recruiting team that personally meets every candidate. ${READING_RULE}

Pick the candidates who would genuinely do well in this job — the way a recruiter who knows them would, not by matching words. A bookkeeper-controller fits "Director of Billing" even if the word "billing" never appears. A calm person who wants a set routine does NOT fit a rushed store counter, even if the title lines up.

THE OPENING
${opening}

${lessons.here.length ? `WHAT THE TEAM ALREADY TOLD US ABOUT THIS OPENING OR COMPANY\n${lessons.here.join("\n")}\n` : ""}${lessons.general.length ? `LESSONS FROM OTHER OPENINGS (the team's own "not a fit" reasons — learn the pattern)\n${lessons.general.join("\n")}\n` : ""}
LISTED CANDIDATES (ready to send)
${listed.map((c, i) => brief(c, `L${i + 1}`)).join("\n\n")}

${unlisted.length ? `NOT LISTED YET (profiles still being finished)\n${unlisted.map((c, i) => brief(c, `U${i + 1}`)).join("\n\n")}` : ""}

Be helpful and a little creative, with logic: look past job titles to what people have actually done and what they're like. Transferable skills count (a restaurant shift manager can run a busy office; a yeshiva administrator can coordinate projects). If you include a less obvious pick, the "why" must make the connection clear.

Rules:
- "strong": you'd confidently suggest them. "good": a real option, worth a call. Leave out anyone weaker. Zero picks is fine.
- At most 6 picks, best first, only from the L list.
- "why": one plain sentence a busy recruiter reads in 3 seconds, about THIS job (what they've done or are like that fits).
- "flag": only if there's a real catch to check (wants part-time, pay too low, too junior, far away). Otherwise "".
- "almost": up to 3 from the U list who'd likely fit once their profile is finished; "missing" says what's needed in a few words.

Reply with only JSON:
{"picks":[{"c":"L3","fit":"strong","why":"...","flag":""}],"almost":[{"c":"U2","why":"...","missing":"..."}]}`;

  let raw = "";
  try {
    raw = (await askAI(prompt)).text;
  } catch (e) {
    console.error("ai match", e);
    return null;
  }
  let out: { picks?: { c: string; fit: string; why: string; flag?: string }[]; almost?: { c: string; why: string; missing: string }[] } = {};
  try {
    out = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
  } catch {
    return null;
  }
  const pick = (tag: string, arr: Cand[], letter: string) => (tag?.startsWith(letter) ? arr[Number(tag.slice(1)) - 1] : undefined);
  const list: AiPick[] = [];
  for (const x of out.picks ?? []) {
    const c = pick(x.c, listed, "L");
    if (c && !list.some((y) => y.id === c.id)) list.push({ id: c.id, fit: x.fit === "strong" ? "strong" : "good", why: String(x.why ?? "").slice(0, 300), flag: x.flag ? String(x.flag).slice(0, 200) : undefined });
  }
  const almost: AiAlmost[] = [];
  for (const x of out.almost ?? []) {
    const c = pick(x.c, unlisted, "U");
    if (c && !almost.some((y) => y.id === c.id)) almost.push({ id: c.id, why: String(x.why ?? "").slice(0, 240), missing: String(x.missing ?? "").slice(0, 120) });
  }
  const res: AiResult = { sig, at: new Date().toISOString(), list: list.slice(0, 6), almost: almost.slice(0, 3) };
  const all = await aiMatches();
  all[p.id] = res;
  await setSetting(KEY, all);
  await tellReps(p, res, [...pool.listed, ...pool.unlisted]);
  return res;
}

// A rep hears once when one of their candidates fits an opening (or nearly does).
async function tellReps(p: Position, r: AiResult, cands: Cand[]) {
  const told = await getSetting<Record<string, string>>(TOLD, {});
  const byId = new Map(cands.map((c) => [c.id, c]));
  const reps = await effectiveReps(cands.map((c) => ({ id: c.id, added_by: c.added_by })));
  const phones = await staffPhones();
  let changed = false;
  const link = `${teamUrl()}/admin/matches/${p.id}`;
  const first = (n: string) => n.trim().split(/\s+/)[0];
  for (const m of r.list) {
    const k = pairKey(p.id, m.id);
    if (told[k]) continue;
    told[k] = new Date().toISOString();
    changed = true;
    const c = byId.get(m.id);
    const rep = reps.get(m.id)?.id;
    const phone = rep ? phones[rep] : null;
    if (c && phone) await sendText({ to: phone, body: `Your candidate ${first(c.full_name)} fits ${p.title}${p.company ? ` at ${p.company}` : ""}. One tap to send: ${link}`, kind: "rep_match", once: `rep_match:${k}` }).catch(() => null);
  }
  for (const m of r.almost) {
    const k = `almost:${pairKey(p.id, m.id)}`;
    if (told[k]) continue;
    told[k] = new Date().toISOString();
    changed = true;
    const c = byId.get(m.id);
    const rep = reps.get(m.id)?.id;
    const phone = rep ? phones[rep] : null;
    if (c && phone) await sendText({ to: phone, body: `Finish ${first(c.full_name)}'s profile: they could fit ${p.title}${p.company ? ` at ${p.company}` : ""}. ${teamUrl()}/admin/candidates/${c.id}`, kind: "rep_almost", once: `rep_almost:${k}` }).catch(() => null);
  }
  if (changed) await setSetting(TOLD, told);
}

// Openings whose matches are missing or out of date (the cron and page visits call this).
export async function refreshMatches(positions: Position[], max = 2) {
  const all = await aiMatches();
  const pool = await matchPool();
  const hidden = await hiddenMatches();
  const profs = await openingProfiles();
  let n = 0;
  for (const p of positions) {
    if (n >= max) break;
    const hc = Object.keys(hidden).filter((k) => k.startsWith(`${p.id}:`)).length;
    if (all[p.id]?.sig === sigFor(p, profs[p.id], pool, hc)) continue;
    await runMatch(p, pool);
    n++;
  }
  return n;
}

// The shape the pages already use: { c, m } with a fit and reasons. AI picks when we
// have them, the old word-matching otherwise.
export function bestFor<C extends { id: string } & Parameters<typeof matchesFor>[1][number]>(
  p: Position,
  pool: C[],
  store: Store,
  n = 10,
): { c: C; m: Match; flag?: string; ai: boolean }[] {
  const r = store[p.id];
  if (r) {
    const byId = new Map(pool.map((c) => [c.id, c]));
    return r.list
      .filter((x) => byId.has(x.id))
      .slice(0, n)
      .map((x, i) => ({ c: byId.get(x.id)!, m: { score: 100 - i, fit: x.fit, why: [x.why] }, flag: x.flag, ai: true }));
  }
  return matchesFor(p, pool, n).map((x) => ({ ...x, ai: false }));
}

export async function logMatchSent(by: string, positionId: string, candidateId: string, to: string) {
  await logActivity(by, "match_sent", { position_id: positionId, candidate_id: candidateId, to });
}

// Where each sent match is up to: sent → opened → unlocked → meeting → hired.
export type Stage = { stage: "sent" | "opened" | "unlocked" | "meeting" | "hired"; at: string; stale: boolean };
export async function matchStages(p: Position): Promise<Map<string, Stage>> {
  const out = new Map<string, Stage>();
  const { data: acts } = await db().from("activity_log").select("action, at, details").in("action", ["match_sent", "match_opened"]).eq("details->>position_id", p.id).order("at");
  for (const a of (acts ?? []) as { action: string; at: string; details: { candidate_id: string } }[]) {
    const cur = out.get(a.details.candidate_id);
    if (a.action === "match_sent" && !cur) out.set(a.details.candidate_id, { stage: "sent", at: a.at, stale: false });
    if (a.action === "match_opened" && cur?.stage === "sent") out.set(a.details.candidate_id, { stage: "opened", at: a.at, stale: false });
  }
  const ids = [...out.keys()];
  if (ids.length && (p.contact_email || p.owner_id)) {
    let ownerIds: string[] = p.owner_id ? [p.owner_id] : [];
    if (p.contact_email) {
      const { data: os } = await db().from("owners").select("id").eq("email", p.contact_email.toLowerCase());
      ownerIds = [...ownerIds, ...(os ?? []).map((o) => o.id as string)];
    }
    if (ownerIds.length) {
      const { data: us } = await db().from("unlocks").select("id, candidate_id, signed_at").in("candidate_id", ids).in("owner_id", ownerIds);
      const unlocks = (us ?? []) as { id: string; candidate_id: string; signed_at: string }[];
      for (const u of unlocks) out.set(u.candidate_id, { stage: "unlocked", at: u.signed_at, stale: false });
      if (unlocks.length) {
        const uid = unlocks.map((u) => u.id);
        const [{ data: ms }, { data: hs }] = await Promise.all([
          db().from("meetings").select("unlock_id, status, starts_at").in("unlock_id", uid).eq("status", "booked"),
          db().from("hires").select("unlock_id, created_at, status").in("unlock_id", uid).neq("status", "refunded"),
        ]);
        const cOf = new Map(unlocks.map((u) => [u.id, u.candidate_id]));
        for (const m of (ms ?? []) as { unlock_id: string; starts_at: string | null }[]) out.set(cOf.get(m.unlock_id)!, { stage: "meeting", at: m.starts_at ?? new Date().toISOString(), stale: false });
        for (const h of (hs ?? []) as { unlock_id: string; created_at: string }[]) out.set(cOf.get(h.unlock_id)!, { stage: "hired", at: h.created_at, stale: false });
      }
    }
  }
  // Waiting three days on the owner (sent or opened, nothing since): time for a friendly follow-up.
  const now = Date.now();
  for (const [k, v] of out) if ((v.stage === "sent" || v.stage === "opened") && now - Date.parse(v.at) > 3 * 864e5) out.set(k, { ...v, stale: true });
  return out;
}
