import { askAI } from "./callDraft";
import { db } from "./db";
import { LEVEL_LABEL } from "./format";
import { memoryOf } from "./memory";
import { describe, parseResult, TRAITS, type Letter } from "./strengths";

// A candidate as a poster for business owners: who's available, and their personality
// in three short lines. Never a name or a face. The rep can change any of it.
type C = { id: string; full_name: string; headline: string | null; role_category: string | null; also_roles: string[] | null; level: string | null; location_region: string | null; working_genius: string | null; highlights?: string[] | null; application: Record<string, string> | null };

const town = (s: string | null) => (s ?? "").replace(/,?\s*(NY|NJ|New York|New Jersey)\b.*$/i, "").trim() || (s ?? "").trim();

export function candPosterDefaults(c: C) {
  const app = c.application ?? {};
  const title = [c.role_category, ...(c.also_roles ?? [])].filter(Boolean).slice(0, 2).join(" / ") || (c.headline ?? "A candidate");
  const meta = [town(c.location_region), c.level ? LEVEL_LABEL[c.level] : null, app.hours || null].filter(Boolean).join(" · ");
  // Strengths Assessment wording: natural strengths = "Great at", can do well = "Good at".
  const l = parseResult(c.working_genius) as Letter[];
  const great = l.length === 6 ? l.slice(0, 2).map((x) => TRAITS[x].label).join(" · ") : "";
  const good = l.length === 6 ? l.slice(2, 4).map((x) => TRAITS[x].label).join(" · ") : "";
  const type = describe(c.working_genius)?.name ?? "";
  const experience = (app.poster_exp || (c.headline ?? "")).trim().replace(/\.$/, "");
  return { title, meta, experience, great, good, type };
}

// One short, enticing line of experience for the poster, written once, then kept.
export async function ensureCandPosterLines(id: string): Promise<void> {
  const { data } = await db().from("candidates").select("id, full_name, headline, role_category, also_roles, highlights, working_genius, admin_notes, application").eq("id", id).maybeSingle();
  if (!data) return;
  const app = (data.application ?? {}) as Record<string, string>;
  if (app.poster_exp) return;
  const m = memoryOf(data as unknown as Parameters<typeof memoryOf>[0]);
  const l = parseResult(data.working_genius as string | null) as Letter[];
  const facts = [
    data.headline,
    m.ready && m.hook,
    ...(m.ready ? m.bullets : ((data.highlights as string[] | null) ?? [])),
    app.rep_take && `The rep: ${app.rep_take}`,
    l.length === 6 && `Natural strengths: ${l.slice(0, 2).map((x) => TRAITS[x].label).join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
  if (!facts.trim()) return;
  try {
    const raw = (await askAI(`From what we know about this job candidate, write ONE short line (at most 60 characters) about their EXPERIENCE that would make a business owner want to meet them, e.g. "10 years running a busy contractor's front office" or "Built a 20-person ops team from scratch". Concrete, true to the facts below, no name, no hype words. Reply with only the line.\n\n${facts.slice(0, 3000)}`)).text;
    const line = raw.split("\n").map((x) => x.replace(/^["'\-•*\s]+|["'\s]+$/g, "").replace(/\.$/, "")).find((x) => x.length > 8 && x.length <= 70);
    if (!line) return;
    await db().from("candidates").update({ application: { ...app, poster_exp: line } }).eq("id", id);
  } catch (e) {
    console.error("candidate poster lines", e);
  }
}
