import { cleanLanguages } from "./languages";
import { ANONYMITY_RULES } from "./anonymity";
import { TRAITS, describe, parseResult } from "./strengths";
import { INDUSTRY_LIST, ROLE_LIST } from "./writingHelp";

// Reads a whole resume (PDF, Word or a photo) and drafts the candidate's profile, so
// the rep checks and fixes instead of filling in a form. Uses their Strengths
// Assessment result too, when we have it.

export type ResumeDraft = {
  full_name: string;
  email: string;
  phone: string;
  linkedin_url: string;
  role_category: string;
  also_roles: string[];
  level: "" | "beginner" | "experienced" | "senior";
  location_region: string;
  industry: string;
  also_industries: string[];
  languages: string[];
  headline: string;
  summary: string;
  highlights: string[];
  full_profile: string;
};

const MODELS = ["claude-sonnet-5-5", "claude-sonnet-4-5"];

function prompt(opts: { letters: string; lookingFor: string; repTake: string; text: string | null }) {
  const l = parseResult(opts.letters);
  const d = describe(opts.letters);
  const strengths =
    l.length >= 2
      ? `Their Strengths Assessment result (use it to shape the headline and summary, in these exact plain words, never naming the assessment): natural strengths: ${l
          .slice(0, 2)
          .map((x) => TRAITS[x].label.toLowerCase())
          .join(" and ")}${d ? ` ("${d.name}": ${d.line})` : ""}${l.length >= 4 ? `; also good at ${l.slice(2, 4).map((x) => TRAITS[x].label.toLowerCase()).join(" and ")}` : ""}.`
      : "No assessment result yet.";
  return `You help a hiring platform turn a candidate's resume into their profile. Business owners browse these profiles BEFORE they know who the person is, then sign to see the full details.

${strengths}
${opts.repTake ? `MOST IMPORTANT. Our rep knows this person. In the rep's words:
"${opts.repTake}"
Write the whole profile around this: who they are, what they want next and where they'd thrive. Their past jobs are proof of what they can do, not necessarily what they want to do again. If the rep says they want something new, don't steer them back to their old field.
` : ""}What they said they're looking for: ${opts.lookingFor || "not given"}

Use the resume as evidence. Don't invent facts, numbers or skills. Warm, specific, plain English, written so an owner thinks "I need that person".

Rules:
- "headline", "summary" and "highlights" are seen before an owner signs, so they must be anonymous:
${ANONYMITY_RULES}
- "headline": one line under 90 characters about what they're great at, e.g. "Bookkeeper who finds the mistake everyone else missed".
- "summary": 2 to 3 sentences: what they are great at and the kind of work they have done, in general terms, and where they would shine.
- "highlights": 3 to 5 short, concrete lines about what they can do, following the anonymity rules above.
- "full_profile": one or two paragraphs, shown only after an owner signs; specifics are fine here.
- "role_category": the single best fit from this list, for the work they'd thrive in next (from what they want and their natural strengths, not just their last title): ${ROLE_LIST.join(", ")}.
- "also_roles": up to 3 more from the same list where they'd thrive.
- "level": "beginner", "experienced" or "senior", judged from their years and scope.
- "location_region": broad area only, like "Brooklyn, NY" or "Northern New Jersey". Never a street.
- "industry": the best fit from this list for where they'd thrive next: ${INDUSTRY_LIST.join(", ")}. "also_industries": up to 3 more from it. If they're open or unsure, pick a sensible range where their strengths matter, rather than just their past field.
- "languages": only languages the resume lists. Empty list if none.
- Contact fields exactly as written on the resume; "" if missing.
- Leave anything the resume doesn't support as "" or [].

Answer with JSON only:
{"full_name":"","email":"","phone":"","linkedin_url":"","role_category":"","also_roles":[],"level":"","location_region":"","industry":"","also_industries":[],"languages":[],"headline":"","summary":"","highlights":[],"full_profile":""}${opts.text ? `\n\nResume:\n${opts.text.slice(0, 60000)}` : ""}`;
}

// The resume goes to the AI as the file itself when it's a PDF or a photo (so scanned
// resumes work too), or as text for Word files.
export async function draftFromResume(file: { buf: Buffer; kind: "pdf" | "docx" | "jpg" | "png"; text?: string }, opts: { letters?: string | null; lookingFor?: string | null; repTake?: string | null } = {}): Promise<ResumeDraft> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("The AI key isn't set up yet.");
  const p = prompt({ letters: opts.letters ?? "", lookingFor: opts.lookingFor ?? "", repTake: opts.repTake ?? "", text: file.kind === "docx" ? file.text ?? "" : null });
  const content =
    file.kind === "docx"
      ? [{ type: "text", text: p }]
      : [
          file.kind === "pdf"
            ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: file.buf.toString("base64") } }
            : { type: "image", source: { type: "base64", media_type: file.kind === "png" ? "image/png" : "image/jpeg", data: file.buf.toString("base64") } },
          { type: "text", text: p },
        ];
  let last = "";
  for (const model of MODELS) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 4000, messages: [{ role: "user", content }] }),
    });
    if (r.ok) {
      const j = (await r.json()) as { content: { text?: string }[] };
      const raw = j.content.map((x) => x.text ?? "").join("");
      return clean(JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)));
    }
    last = `${r.status}`;
    if (r.status !== 404 && r.status !== 400) break;
  }
  throw new Error(`The AI didn't answer (${last}).`);
}

const str = (x: unknown) => (typeof x === "string" ? x.trim() : "");
const list = (x: unknown) => (Array.isArray(x) ? x.map(str).filter(Boolean) : []);
const fromList = (xs: string[], allowed: string[]) => xs.map((x) => allowed.find((a) => a.toLowerCase() === x.toLowerCase())).filter((x): x is string => !!x);

function clean(j: Record<string, unknown>): ResumeDraft {
  const role = fromList([str(j.role_category)], ROLE_LIST)[0] ?? "";
  const industry = fromList([str(j.industry)], INDUSTRY_LIST)[0] ?? "";
  const level = str(j.level).toLowerCase();
  return {
    full_name: str(j.full_name),
    email: str(j.email).toLowerCase(),
    phone: str(j.phone),
    linkedin_url: str(j.linkedin_url) && !/^https?:/.test(str(j.linkedin_url)) ? `https://${str(j.linkedin_url)}` : str(j.linkedin_url),
    role_category: role,
    also_roles: fromList(list(j.also_roles), ROLE_LIST).filter((r) => r !== role).slice(0, 3),
    level: (["beginner", "experienced", "senior"].includes(level) ? level : "") as ResumeDraft["level"],
    location_region: str(j.location_region),
    industry,
    also_industries: fromList(list(j.also_industries), INDUSTRY_LIST).filter((r) => r !== industry).slice(0, 3),
    languages: cleanLanguages(list(j.languages)),
    headline: str(j.headline).slice(0, 120),
    summary: str(j.summary),
    highlights: list(j.highlights).slice(0, 5),
    full_profile: str(j.full_profile),
  };
}
