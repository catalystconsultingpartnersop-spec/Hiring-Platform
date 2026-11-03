import { db, logActivity } from "./db";
import { gatherSources } from "./cleanResume";
import { describe, profileOf, suggestedHeadline, TRAITS } from "./strengths";
import { LEVEL_LABEL, WORK_MODE_LABEL, salaryRange } from "./format";
import { languagesText } from "./languages";
import { parseOwnerPage, type OwnerPage } from "./ownerPageShared";

export { parseOwnerPage, handleFromText, handleToText, type OwnerPage, type HandleItem } from "./ownerPageShared";

// The part of a candidate's public page written for business owners: a warm
// introduction, the practical things they'd handle, and who they're a strong fit
// for. Drafted from the candidate's resume, call and strengths; reps can edit it.
// Stored in application.owner_page (as JSON), so no new column is needed.

const MODELS = ["claude-sonnet-5-5", "claude-sonnet-4-5"];

// Just the owner page for one listed candidate (the public page never loads the rest of
// their application).
export async function loadOwnerPage(candidateId: string): Promise<OwnerPage | null> {
  const { data } = await db().from("candidates").select("owner_page:application->>owner_page").eq("id", candidateId).maybeSingle();
  return parseOwnerPage((data as { owner_page?: string } | null)?.owner_page);
}

// Save the page. "auto" means the system wrote it and nobody has changed it, so we
// keep it up to date by ourselves. Once a rep edits it, we leave their words alone.
export async function saveOwnerPage(candidateId: string, page: OwnerPage | null, by: string, opts: { auto?: boolean } = {}) {
  const { data: c } = await db().from("candidates").select("application").eq("id", candidateId).maybeSingle();
  if (!c) return;
  const app = { ...((c.application ?? {}) as Record<string, string>) };
  const before = parseOwnerPage(app.owner_page);
  const body = (x: OwnerPage | null) => (x ? JSON.stringify({ intro: x.intro, handle: x.handle, fit: x.fit, years: x.years }) : "");
  if (!opts.auto && body(before) === body(page)) return; // the rep saved without changing it
  if (page) app.owner_page = JSON.stringify({ ...page, auto: !!opts.auto, at: new Date().toISOString(), by });
  else delete app.owner_page;
  await db().from("candidates").update({ application: app }).eq("id", candidateId);
}

// ---- Drafting it ----

async function askAI(content: unknown[]): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("The AI key isn't set up yet.");
  let last = "";
  for (const model of MODELS) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 2000, messages: [{ role: "user", content }] }),
    });
    if (r.ok) {
      const j = (await r.json()) as { content: { text?: string }[] };
      return j.content.map((x) => x.text ?? "").join("");
    }
    last = `${r.status}`;
    if (r.status !== 404 && r.status !== 400) break;
  }
  throw new Error(`The AI didn't answer (${last}). Try again in a minute.`);
}

export async function draftOwnerPage(candidateId: string): Promise<{ page: OwnerPage; headline: string } | { error: string }> {
  const g = await gatherSources(candidateId);
  if (!g) return { error: "Couldn't find this candidate." };
  const { c, app, pdf, text, photo, call, notes } = g;
  const p = profileOf(c.working_genius);
  const d = describe(c.working_genius);
  const facts = [
    c.role_category && `Role they want: ${c.role_category}`,
    (c.also_roles ?? []).length && `Also a fit for: ${(c.also_roles as string[]).join(", ")}`,
    c.industry && `Industry: ${c.industry}`,
    c.level && `Experience level: ${LEVEL_LABEL[c.level as keyof typeof LEVEL_LABEL] ?? c.level}`,
    c.location_region && `Location: ${c.location_region}`,
    c.work_mode && `Work setting: ${WORK_MODE_LABEL[c.work_mode as keyof typeof WORK_MODE_LABEL] ?? c.work_mode}`,
    salaryRange(c.salary_min, c.salary_max) && `Salary they're looking for: ${salaryRange(c.salary_min, c.salary_max)}`,
    languagesText(c.languages) && `Languages: ${languagesText(c.languages)}`,
    p.primary.length && `Natural strengths (from their Working Genius): ${p.primary.map((l) => TRAITS[l].label.toLowerCase()).join(", ")}`,
    p.secondary.length && `Also good at: ${p.secondary.map((l) => TRAITS[l].label.toLowerCase()).join(", ")}`,
    d && `How they work: ${d.thrives} ${d.alsoBrings ?? ""}`,
    c.headline && `Current headline: ${c.headline}`,
    c.summary && `Our current summary: ${c.summary}`,
    (c.highlights ?? []).length && `Our highlights: ${(c.highlights as string[]).join("; ")}`,
    app.looking_for && `What they told us they want: ${app.looking_for}`,
    app.experience && `Experience they told us about: ${app.experience}`,
    app.about && `About them, in their words: ${app.about}`,
  ]
    .filter(Boolean)
    .join("\n");
  if (!pdf && !text && !photo && !call && !c.summary && !app.experience) return { error: "There isn't enough about them yet. Add their resume or summary first." };

  const prompt = `You write the candidate page that business owners read on a hiring site. Owners browse anonymous, vetted candidates and decide whether to meet one.

${pdf || photo ? "Their resume is attached." : text ? `Their resume:\n${text.slice(0, 25000)}` : "No resume on file."}

${call ? `What they told our team on their call:\n${call.slice(0, 40000)}` : notes ? `Our team's notes from talking with them:\n${notes.slice(0, 6000)}` : ""}

What we know:
${facts}

Write to the business owner. The goal: an owner reads it and thinks "yes, I need this person". Make the candidate sound like a real, capable person.

Voice: warm and positive, but clear, precise and practical. No hype, no jokes, no punchy slogans, no exclamation marks, no clichés like "rockstar" or "go-getter". Plain American English.

Strict rules:
- Anonymous: never use their name, employers, clients, schools or exact job titles that would identify them. Say "they".
- Only use facts from the material above. Never invent numbers, tools, results or experience. If the material is thin, write less.
- Never mention weaknesses, things they find draining, Working Genius letters or jargon.

Return only JSON:
{
  "headline": "one line, max 12 words, what they are and what they do for a business, e.g. A senior product owner who takes ideas all the way to a finished product",
  "intro": "2 to 3 sentences to the owner. Start with the kind of business or need this person is right for (e.g. 'If you're developing products and need one person who can...'). Then their experience in concrete terms.",
  "years": "years of experience if clearly stated or easy to add up from the resume, like '7+ years'; otherwise empty",
  "handle": [{"icon": "one fitting emoji", "title": "what they'd handle for the owner, 3 to 7 words, starting with a verb", "detail": "one practical sentence, max 18 words, on what that means for the business"}],
  "fit": ["2 or 3 short lines that complete 'A strong fit if you...', each starting with a capital verb, e.g. 'Want one person to own a project, not just one piece of it'"]
}
Give 3 to 5 "handle" items, fewer if the material is thin.`;

  const content: unknown[] = [];
  if (pdf) content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf } });
  if (photo) content.push({ type: "image", source: { type: "base64", media_type: photo.type, data: photo.data } });
  content.push({ type: "text", text: prompt });

  let raw: string;
  try {
    raw = await askAI(content);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  const page = parseOwnerPage(json);
  if (!page) return { error: "The draft didn't come through right. Try again." };
  page.handle = page.handle.slice(0, 5);
  page.fit = page.fit.slice(0, 3);
  let headline = "";
  try {
    headline = String((JSON.parse(json) as { headline?: string }).headline ?? "").trim();
  } catch {}
  return { page, headline };
}

// Every listed candidate gets the page automatically: written when they're listed,
// and rewritten when their details change, unless a rep has edited it by hand.
// The headline is filled in too, when the rep hasn't written their own.
export async function fillOwnerPage(candidateId: string, by: string, opts: { refresh?: boolean } = {}) {
  const { data } = await db()
    .from("candidates")
    .select("status, headline, role_category, working_genius, owner_page:application->>owner_page")
    .eq("id", candidateId)
    .maybeSingle();
  if (!data || data.status !== "listed") return;
  const have = parseOwnerPage((data as { owner_page?: string }).owner_page);
  if (have && !(opts.refresh && have.auto)) return;
  const r = await draftOwnerPage(candidateId);
  if ("error" in r) return;
  await saveOwnerPage(candidateId, r.page, by, { auto: true });
  const generic = !data.headline || (data.role_category && data.headline === suggestedHeadline(data.role_category, data.working_genius));
  if (generic && r.headline) await db().from("candidates").update({ headline: r.headline.slice(0, 140) }).eq("id", candidateId);
  await logActivity(by, "owner_page_written", { candidate_id: candidateId, refresh: !!have });
}
