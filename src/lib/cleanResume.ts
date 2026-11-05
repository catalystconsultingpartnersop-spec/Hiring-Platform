import { db, logActivity } from "./db";
import { roomTranscript } from "./googleCalls";
import { languagesText } from "./languages";
import { resumeText } from "./resume";

// The resume clean-up tool: takes the candidate's own resume, plus what they
// told us on their call, and writes a clean, presentable version. The original
// file is never touched; the clean version is stored next to it as text, with
// who made it, when, and from what.

const MODELS = ["claude-sonnet-5-5", "claude-sonnet-4-5"];

export type CleanResume = { text: string; at: string; by: string; sources: string; notes: string };

export function cleanResumeOf(application: Record<string, string> | null | undefined): CleanResume | null {
  const a = application ?? {};
  if (!a.clean_resume) return null;
  return { text: a.clean_resume, at: a.clean_resume_at ?? "", by: a.clean_resume_by ?? "", sources: a.clean_resume_sources ?? "", notes: a.clean_resume_notes ?? "" };
}

const FORMAT = `Write it in exactly this plain format (it is turned into a designed PDF):

# Full Name
email · phone · City, State · LinkedIn (only the ones you have)
> One-line professional headline

## Summary
Two to four sentences.

## Experience
### Job Title | Company | City, State | Mon YYYY – Mon YYYY
- Achievement-focused bullet starting with a strong verb
- Another bullet

## Skills
Skill, Skill, Skill

## Education
### Degree or Program | School | Year

## Languages
English, Yiddish

Leave out any section you have nothing for. Use "Present" for a current job.`;

function promptFor(o: { name: string; resumeText: string | null; hasPdf: boolean; call: string | null; extra: string }) {
  return `You are helping a staffing team turn a candidate's resume into a clean, professional one that business owners will read.

Candidate: ${o.name}

${o.hasPdf ? "Their original resume is attached (a PDF, or a photo of it)." : o.resumeText ? `Their original resume (text):\n${o.resumeText.slice(0, 30000)}` : "There is no readable resume on file; build it only from the call, our notes and what their rep wrote about them. If that is thin, keep the resume short and leave out anything you cannot support; never fill gaps with made-up jobs or dates."}

${o.call ? `What they told our team on their onboarding call:\n${o.call.slice(0, 60000)}` : "No call transcript is available."}

${o.extra}

Rules:
- Keep every real job, title, company, date and school from the original. Fix spelling, grammar, tense and formatting, and make the layout consistent.
- Rewrite bullets to be clear and achievement-focused, but never invent employers, titles, dates, numbers, degrees or certifications.
- You may add skills, responsibilities, accomplishments or languages the candidate clearly said on the call. Don't add anything they didn't say.
- No photo, age, date of birth, marital status, religion or other personal details. Keep contact details only if they appear in the original or notes.
- Aim for one page; two at most.
- American resume conventions.

${FORMAT}

After the resume, write a line with only ---CHANGES--- and then 2 to 6 short bullet lines (starting with "- ") for our team: what you fixed, and anything you added from the call.`;
}

async function askAI(content: unknown[]): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("The AI key isn't set up yet.");
  let last = "";
  for (const model of MODELS) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 4000, messages: [{ role: "user", content }] }),
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

// Everything we have to work from for a candidate: their resume file and what they
// said on their call (or our notes). Used for the clean resume and the owner page.
export async function gatherSources(candidateId: string) {
  const { data: c } = await db().from("candidates").select("*").eq("id", candidateId).maybeSingle();
  if (!c) return null;
  const app = (c.application ?? {}) as Record<string, string>;
  const sources: string[] = [];

  // Their own resume: PDFs go to the AI as-is (scans included); Word files as text.
  let pdf: string | null = null;
  let text: string | null = null;
  let photo: { data: string; type: string } | null = null;
  if (c.resume_path) {
    const { data: file } = await db().storage.from("resumes").download(c.resume_path);
    if (file) {
      const buf = Buffer.from(await file.arrayBuffer());
      if (/\.pdf$/i.test(c.resume_path)) pdf = buf.toString("base64");
      else if (/\.(jpe?g|png)$/i.test(c.resume_path)) photo = { data: buf.toString("base64"), type: /\.png$/i.test(c.resume_path) ? "image/png" : "image/jpeg" };
      else if (/\.docx$/i.test(c.resume_path)) text = await resumeText(buf, "docx").catch(() => null);
    }
    if (pdf || text || photo) sources.push("their resume");
  }

  // What they said on the call: the transcript if it was recorded, otherwise our notes.
  let call: string | null = null;
  const { data: calls } = await db()
    .from("onboarding_calls")
    .select("meet_space, status, starts_at")
    .eq("candidate_id", candidateId)
    .neq("status", "cancelled")
    .order("starts_at", { ascending: false });
  const space = (calls ?? []).find((k) => k.meet_space)?.meet_space as string | undefined;
  if (space) {
    call = await roomTranscript(space).catch(() => null);
    if (call) sources.push("their call");
  }
  let draftNotes = "";
  try {
    draftNotes = app.call_draft ? (JSON.parse(app.call_draft) as { private_notes?: string }).private_notes ?? "" : "";
  } catch {}
  const notes = [c.admin_notes, draftNotes].filter(Boolean).join("\n");
  if (!call && notes) sources.push("our notes");
  if (app.rep_take) sources.push("their rep's first take");
  return { c, app, pdf, text, photo, call, notes, sources };
}

export async function makeCleanResume(candidateId: string, by: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const g = await gatherSources(candidateId);
  if (!g) return { ok: false, error: "Couldn't find this candidate." };
  const { c, app, pdf, text, photo, call, notes, sources } = g;
  const repTake = (app.rep_take ?? "").trim();
  if (!pdf && !text && !photo && !call && !notes && !repTake && !app.experience)
    return { ok: false, error: "There's nothing to work from yet. Add their resume, write your first take on them, or have the call." };

  const extra = [
    `Contact details we have: ${[c.email, c.phone, c.linkedin_url].filter(Boolean).join(" · ") || "none"}`,
    c.location_region ? `Location: ${c.location_region}` : "",
    languagesText(c.languages) ? `Languages: ${languagesText(c.languages)}` : "",
    app.looking_for ? `What they're looking for: ${app.looking_for}` : "",
    repTake ? `What their rep knows about them (who they are and what they want next). This leads: the headline and summary at the top follow it, and nothing on the resume should contradict it:\n${repTake}` : "",
    app.experience ? `Experience they told us about: ${app.experience}` : "",
    c.summary ? `Our profile summary of them: ${c.summary}` : "",
    (c.highlights ?? []).length ? `Our highlights: ${(c.highlights as string[]).join("; ")}` : "",
    !call && notes ? `Our team's notes from talking with them:\n${notes.slice(0, 8000)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const content: unknown[] = [];
  if (pdf) content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf } });
  if (photo) content.push({ type: "image", source: { type: "base64", media_type: photo.type, data: photo.data } });
  content.push({ type: "text", text: promptFor({ name: c.full_name, resumeText: text, hasPdf: !!pdf || !!photo, call, extra }) });

  let raw: string;
  try {
    raw = await askAI(content);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const [resume, changes = ""] = raw.split(/^-{3}CHANGES-{3}\s*$/m);
  const body = resume.trim().replace(/^```\w*\n?|```$/g, "").trim();
  if (!body.startsWith("#")) return { ok: false, error: "The AI's answer didn't come through right. Try again." };

  const next: Record<string, string> = {
    ...app,
    clean_resume: body,
    clean_resume_at: new Date().toISOString(),
    clean_resume_by: by,
    clean_resume_sources: sources.length > 1 ? `${sources.slice(0, -1).join(", ")} and ${sources[sources.length - 1]}` : sources.join(""),
    clean_resume_notes: changes.trim(),
  };
  if (app.clean_resume) next.clean_resume_prev = app.clean_resume;
  await db().from("candidates").update({ application: next }).eq("id", candidateId);
  await logActivity(by, "clean_resume_made", { candidate_id: candidateId, sources });
  return { ok: true };
}

export async function saveCleanResumeText(candidateId: string, text: string, by: string) {
  const { data: c } = await db().from("candidates").select("application").eq("id", candidateId).maybeSingle();
  if (!c) return;
  const app = (c.application ?? {}) as Record<string, string>;
  const next: Record<string, string> = { ...app, clean_resume: text.slice(0, 30000), clean_resume_at: new Date().toISOString(), clean_resume_by: by, clean_resume_prev: app.clean_resume ?? "" };
  if (!app.clean_resume_sources) next.clean_resume_sources = "typed by hand";
  await db().from("candidates").update({ application: next }).eq("id", candidateId);
  await logActivity(by, "clean_resume_edited", { candidate_id: candidateId });
}

// ---- Reading the plain format back into parts, for the PDF ----

export type ResumeEntry = { head: string[]; bullets: string[]; lines: string[] };
export type ResumeSection = { title: string; entries: ResumeEntry[]; lines: string[]; bullets: string[] };
export type ParsedResume = { name: string; contact: string; headline: string; sections: ResumeSection[] };

export function parseCleanResume(text: string): ParsedResume {
  const out: ParsedResume = { name: "", contact: "", headline: "", sections: [] };
  let sec: ResumeSection | null = null;
  let entry: ResumeEntry | null = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("# ") && !out.name) out.name = line.slice(2).trim();
    else if (line.startsWith("> ")) out.headline = line.slice(2).trim();
    else if (line.startsWith("## ")) {
      sec = { title: line.slice(3).trim(), entries: [], lines: [], bullets: [] };
      entry = null;
      out.sections.push(sec);
    } else if (line.startsWith("### ") && sec) {
      entry = { head: line.slice(4).split("|").map((x) => x.trim()).filter(Boolean), bullets: [], lines: [] };
      sec.entries.push(entry);
    } else if (/^[-•*]\s+/.test(line)) {
      const b = line.replace(/^[-•*]\s+/, "");
      if (entry) entry.bullets.push(b);
      else if (sec) sec.bullets.push(b);
    } else if (!sec) {
      if (!out.contact) out.contact = line;
    } else if (entry) entry.lines.push(line);
    else sec.lines.push(line);
  }
  return out;
}
