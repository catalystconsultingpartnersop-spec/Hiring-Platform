import { askAI } from "./callDraft";
import { db } from "./db";
import { LEVEL_LABEL } from "./format";
import { memoryOf } from "./memory";
import { parseResult, TRAITS, type Letter } from "./strengths";

// A candidate as a poster for business owners: who's available, and their personality
// in three short lines. Never a name or a face. The rep can change any of it.
type C = { id: string; full_name: string; headline: string | null; role_category: string | null; also_roles: string[] | null; level: string | null; location_region: string | null; working_genius: string | null; highlights?: string[] | null; application: Record<string, string> | null };

const town = (s: string | null) => (s ?? "").replace(/,?\s*(NY|NJ|New York|New Jersey)\b.*$/i, "").trim() || (s ?? "").trim();

export function candPosterDefaults(c: C) {
  const app = c.application ?? {};
  const title = [c.role_category, ...(c.also_roles ?? [])].filter(Boolean).slice(0, 2).join(" / ") || (c.headline ?? "A candidate");
  const meta = [town(c.location_region), c.level ? LEVEL_LABEL[c.level] : null, app.hours || null].filter(Boolean).join(" · ");
  let lines: string[] = [];
  try {
    lines = JSON.parse(app.poster_lines ?? "[]");
  } catch {}
  if (!lines.length) {
    const l = parseResult(c.working_genius) as Letter[];
    lines = l.length === 6 ? l.slice(0, 2).map((x) => TRAITS[x].label) : [];
  }
  return { title, meta, lines: lines.slice(0, 3) };
}

// Three short personality lines, written once from what the team knows, then kept.
export async function ensureCandPosterLines(id: string): Promise<void> {
  const { data } = await db().from("candidates").select("id, full_name, headline, role_category, also_roles, highlights, working_genius, admin_notes, application").eq("id", id).maybeSingle();
  if (!data) return;
  const app = (data.application ?? {}) as Record<string, string>;
  if (app.poster_lines) return;
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
    const raw = (await askAI(`From what we know about this job candidate, write 3 very short lines (2 to 5 words each) describing their PERSONALITY and how they work, for a poster aimed at business owners, e.g. "Calm under pressure", "Owns the details", "Customers love him". Only what's supported below. No names. Reply with only the 3 lines, one per line, no bullets.\n\n${facts.slice(0, 3000)}`)).text;
    const lines = raw.split("\n").map((x) => x.replace(/^[-•*\d.\s]+/, "").trim().replace(/\.$/, "")).filter((x) => x && x.length <= 40).slice(0, 3);
    if (!lines.length) return;
    await db().from("candidates").update({ application: { ...app, poster_lines: JSON.stringify(lines) } }).eq("id", id);
  } catch (e) {
    console.error("candidate poster lines", e);
  }
}
