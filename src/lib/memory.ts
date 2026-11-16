import { askAI } from "./callDraft";
import { db, logActivity } from "./db";
import { roomTranscript } from "./googleCalls";

// A "memory card" for the team: one line to remember a candidate by, a few
// facts, a quote in their own words, and what they'd be good for. Team only,
// so it uses their real story. Written by AI from the call, the rep's take and
// our notes; the rep can change the top line. Kept in application.memory.

export type Memory = { hook: string; bullets: string[]; quote: string; good_for: string[]; made_at?: string; edited?: boolean };
type Cand = {
  id: string;
  full_name: string;
  headline: string | null;
  highlights?: string[] | null;
  role_category: string | null;
  also_roles: string[] | null;
  application: Record<string, string> | null;
};

// What the card shows. Until the AI one is made, it falls back to what the profile already says.
export function memoryOf(c: Cand): Memory & { ready: boolean } {
  let m: Partial<Memory> = {};
  try {
    m = JSON.parse(c.application?.memory ?? "{}");
  } catch {}
  const roles = [c.role_category, ...(c.also_roles ?? [])].filter(Boolean) as string[];
  return {
    hook: m.hook || c.headline || "",
    bullets: m.bullets?.length ? m.bullets : (c.highlights ?? []).slice(0, 3),
    quote: m.quote ?? "",
    good_for: m.good_for?.length ? m.good_for : roles,
    made_at: m.made_at,
    edited: m.edited,
    ready: !!m.hook,
  };
}

export async function makeMemory(candidateId: string): Promise<boolean> {
  const { data: c } = await db().from("candidates").select("*").eq("id", candidateId).maybeSingle();
  if (!c) return false;
  const app = (c.application ?? {}) as Record<string, string>;
  const { data: calls } = await db().from("onboarding_calls").select("meet_space").eq("candidate_id", candidateId).neq("status", "cancelled").not("meet_space", "is", null).order("starts_at", { ascending: false }).limit(1);
  let transcript = "";
  const space = (calls ?? [])[0]?.meet_space as string | undefined;
  if (space) transcript = (await roomTranscript(space).catch(() => null)) ?? "";
  const known = [
    app.rep_take && `The rep's own take: ${app.rep_take}`,
    c.admin_notes && `Team notes: ${c.admin_notes}`,
    c.headline && `Headline: ${c.headline}`,
    c.summary && `Summary: ${c.summary}`,
    (c.highlights ?? []).length && `Highlights: ${(c.highlights as string[]).join("; ")}`,
    c.full_profile && `Full profile: ${String(c.full_profile).slice(0, 3000)}`,
    app.looking_for && `Looking for: ${app.looking_for}`,
    transcript && `Transcript of their call with us:\n${transcript.slice(0, 60000)}`,
  ].filter(Boolean);
  if (known.length < 2 && !transcript) return false;
  const prompt = `You help recruiters remember candidates they met weeks ago. Below is everything we know about ${c.full_name}. Write a memory card for the team's private use, so a rep scanning forty cards thinks "oh, THAT one".

Use only facts found below. Plain, concrete English. No flattery, no buzzwords.

Reply with only JSON:
{"hook": "one line under 80 characters: the single most memorable, specific thing about this person, starting with what they do, e.g. 'The delivery guy who rebuilt the whole route board on his own'",
 "bullets": ["3 short lines: what they did and for how long; what they're like to work with; what they want next"],
 "quote": "one sentence they actually said on the call, word for word, that sounds like them. Empty string if there is no transcript.",
 "good_for": ["2 to 4 kinds of jobs they would fit, a few words each"]}

${known.join("\n\n")}`;
  const { text } = await askAI(prompt);
  const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as Memory;
  if (!j.hook) return false;
  // Never overwrite a top line the rep wrote themselves.
  let old: Partial<Memory> = {};
  try {
    old = JSON.parse(app.memory ?? "{}");
  } catch {}
  const memory: Memory = {
    hook: old.edited && old.hook ? old.hook : String(j.hook).slice(0, 140),
    bullets: (j.bullets ?? []).map(String).slice(0, 4),
    quote: transcript ? String(j.quote ?? "").slice(0, 240) : "",
    good_for: (j.good_for ?? []).map(String).slice(0, 4),
    made_at: new Date().toISOString(),
    edited: old.edited,
  };
  const { data: fresh } = await db().from("candidates").select("application").eq("id", candidateId).maybeSingle();
  await db().from("candidates").update({ application: { ...((fresh?.application as object) ?? app), memory: JSON.stringify(memory) } }).eq("id", candidateId);
  await logActivity("system", "memory_made", { candidate_id: candidateId });
  return true;
}

// Catch up a few at a time, newest first, whenever someone opens the page.
export async function backfillMemories(max = 3) {
  if (!process.env.ANTHROPIC_API_KEY) return 0;
  const { data } = await db().from("candidates").select("id, application, headline").in("status", ["listed", "draft", "paused"]).order("created_at", { ascending: false }).limit(200);
  const todo = ((data ?? []) as { id: string; application: Record<string, string> | null; headline: string | null }[]).filter((c) => !c.application?.memory && c.headline).slice(0, max);
  let n = 0;
  for (const c of todo) if (await makeMemory(c.id).catch(() => false)) n++;
  return n;
}

export async function setHook(candidateId: string, hook: string) {
  const { data: c } = await db().from("candidates").select("application").eq("id", candidateId).maybeSingle();
  if (!c) return;
  const app = (c.application ?? {}) as Record<string, string>;
  let m: Partial<Memory> = {};
  try {
    m = JSON.parse(app.memory ?? "{}");
  } catch {}
  await db().from("candidates").update({ application: { ...app, memory: JSON.stringify({ bullets: [], quote: "", good_for: [], ...m, hook: hook.trim().slice(0, 140), edited: true }) } }).eq("id", candidateId);
}
