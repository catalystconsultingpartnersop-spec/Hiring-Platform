import { db, PUBLIC_CANDIDATE_COLUMNS, type PublicCandidate } from "./db";
import type { Position } from "./matching";
import { ROLE_LIST } from "./writingHelp";

// Open positions: private, only for matching. Never shown on the public site.

export async function openPositions(): Promise<Position[]> {
  const { data, error } = await db().from("positions").select("*").eq("status", "open").order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as Position[];
}

export async function getPosition(id: string): Promise<Position | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db().from("positions").select("*").eq("id", id).maybeSingle();
  return (data as Position) ?? null;
}

// Candidates the matching looks at: everyone listed, plus who they are and whose they are (team only).
export type TeamCandidate = PublicCandidate & { full_name: string; added_by: string | null };
export async function matchableCandidates(): Promise<TeamCandidate[]> {
  const { data } = await db().from("candidates").select(`${PUBLIC_CANDIDATE_COLUMNS}, full_name, added_by`).eq("status", "listed");
  return (data ?? []) as unknown as TeamCandidate[];
}

// Whether the positions table exists yet (the database step).
export async function positionsReady(): Promise<boolean> {
  const { error } = await db().from("positions").select("id", { head: true, count: "exact" }).limit(1);
  return !error;
}

export const POSITION_FIELDS = ["title", "company", "location", "work_mode", "salary_min", "salary_max", "level", "role_category", "industry", "starts", "needs", "description", "contact_name", "contact_email", "url"] as const;
export type PositionDraft = Partial<Record<(typeof POSITION_FIELDS)[number], string>>;

const MODELS = ["claude-sonnet-5-5", "claude-sonnet-4-5"];

// "Fill it in for me": read a pasted job post into the position's fields.
export async function readJobPost(text: string): Promise<PositionDraft | { error: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { error: "The AI key isn't set up yet." };
  const prompt = `Read this job post and pull out its details for a hiring team's private list.

Job post:
${text.slice(0, 20000)}

Reply with only JSON, using "" for anything the post doesn't say. Never guess.
{
  "title": "job title",
  "company": "company name",
  "location": "City, State",
  "work_mode": "one of: on-site, hybrid, remote, flexible, or empty",
  "salary_min": "yearly number only, e.g. 70000 (convert hourly x2080)",
  "salary_max": "yearly number only",
  "level": "one of: beginner, experienced, senior, or empty",
  "role_category": "the closest of: ${ROLE_LIST.join(", ")}",
  "industry": "industry",
  "starts": "when they want someone to start, e.g. As soon as possible",
  "needs": "what the job needs most in a person, a short phrase, e.g. Follow-through, organized, calm with vendors",
  "description": "2 to 3 sentences on what the job is",
  "contact_name": "",
  "contact_email": "",
  "url": ""
}`;
  let last = "";
  for (const model of MODELS) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
    });
    if (r.ok) {
      const j = (await r.json()) as { content: { text?: string }[] };
      const raw = j.content.map((x) => x.text ?? "").join("");
      try {
        const out = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as Record<string, unknown>;
        return Object.fromEntries(POSITION_FIELDS.map((f) => [f, String(out[f] ?? "").trim()])) as PositionDraft;
      } catch {
        return { error: "Couldn't read that post. Try again, or fill it in by hand." };
      }
    }
    last = `${r.status}`;
    if (r.status !== 404 && r.status !== 400) break;
  }
  return { error: `The AI didn't answer (${last}). Fill it in by hand, or try again.` };
}
