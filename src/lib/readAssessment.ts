import { db, logActivity } from "./db";
import { parseResult, type Letter } from "./strengths";

// Reads a candidate's uploaded Working Genius report (PDF or photo) and fills in
// their result, so the team can see it at a glance. Never overwrites what a rep typed.

const MODELS = ["claude-sonnet-5-5", "claude-sonnet-4-5"];
const ALL: Letter[] = ["W", "I", "D", "G", "E", "T"];

const PROMPT = `This should be a person's Working Genius assessment report (by The Table Group / Patrick Lencioni).
Read their results. The six types are Wonder (W), Invention (I), Discernment (D), Galvanizing (G), Enablement (E), Tenacity (T).
Answer with JSON only, no other text:
{"found": true, "geniuses": ["?","?"], "competencies": ["?","?"], "frustrations": ["?","?"]}
Use the single letters. Put them in the order the report lists them. If this isn't a Working Genius report or you can't read the results, answer {"found": false}.`;

// Returns the result, null if the AI read it but found no result, or undefined if it couldn't be asked (try again later).
export async function readWorkingGenius(data: Buffer, mime: string): Promise<string | null | undefined> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return undefined;
  const isPdf = mime === "application/pdf";
  if (!isPdf && !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mime)) return null;
  const file = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: data.toString("base64") } }
    : { type: "image", source: { type: "base64", media_type: mime, data: data.toString("base64") } };
  for (const model of MODELS) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 300, messages: [{ role: "user", content: [file, { type: "text", text: PROMPT }] }] }),
    });
    if (!r.ok) {
      if (r.status === 404 || r.status === 400) continue;
      return undefined;
    }
    const j = (await r.json()) as { content: { text?: string }[] };
    const raw = j.content.map((x) => x.text ?? "").join("");
    try {
      const o = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as { found?: boolean; geniuses?: string[]; competencies?: string[]; frustrations?: string[] };
      if (!o.found) return null;
      const g = parseResult((o.geniuses ?? []).join(""));
      const f = parseResult((o.frustrations ?? []).join("")).filter((l) => !g.includes(l));
      let c = parseResult((o.competencies ?? []).join("")).filter((l) => !g.includes(l) && !f.includes(l));
      if (g.length !== 2 || f.length !== 2) return null;
      if (c.length !== 2) c = ALL.filter((l) => !g.includes(l) && !f.includes(l));
      return [...g, ...c, ...f].join("");
    } catch {
      return null;
    }
  }
  return undefined;
}

// Read one candidate's stored report and save the result if nothing is there yet.
export async function fillWorkingGenius(candidateId: string): Promise<string | null> {
  const { data: c } = await db().from("candidates").select("id, working_genius, assessment_path, application").eq("id", candidateId).maybeSingle();
  if (!c?.assessment_path) return null;
  const path = c.assessment_path as string;
  const mime = path.endsWith(".pdf") ? "application/pdf" : path.endsWith(".png") ? "image/png" : "image/jpeg";
  let result: string | null | undefined;
  try {
    const { data: blob } = await db().storage.from("resumes").download(path);
    if (blob) result = await readWorkingGenius(Buffer.from(await blob.arrayBuffer()), mime);
  } catch (e) {
    console.error("could not read assessment", e);
  }
  if (result === undefined) return null; // couldn't ask the AI right now; try again next time
  const fresh = (await db().from("candidates").select("working_genius, application").eq("id", candidateId).maybeSingle()).data;
  const update: Record<string, unknown> = { application: { ...(fresh?.application ?? c.application ?? {}), wg_read_at: new Date().toISOString(), wg_read: result ?? "unreadable" } };
  if (result && !fresh?.working_genius) update.working_genius = result;
  await db().from("candidates").update(update).eq("id", candidateId);
  await logActivity("system", "assessment_read", { candidate_id: candidateId, result });
  return result;
}

// Reports uploaded before this existed: read a few at a time.
export async function backfillWorkingGenius(max = 3) {
  const { data } = await db()
    .from("candidates")
    .select("id, working_genius, application")
    .not("assessment_path", "is", null)
    .is("working_genius", null)
    .limit(40);
  const todo = ((data ?? []) as { id: string; application: Record<string, string> | null }[]).filter((c) => !c.application?.wg_read_at).slice(0, max);
  for (const c of todo) await fillWorkingGenius(c.id);
}
