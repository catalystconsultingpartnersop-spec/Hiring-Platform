import { askAI } from "./callDraft";
import { db, logActivity } from "./db";
import type { Position } from "./matching";
import { getSetting, setSetting } from "./settings";
import { ROLE_LIST } from "./writingHelp";

// Job openings, written up the way candidates are: what the job is, what the day
// is like, who does well there, and what we still need to ask the owner. Written
// by the AI from whatever we have (a pasted post, one line, an owner's request,
// call notes). Nothing for reps to fill in. Kept in app_settings, so no new tables.

export type OpeningProfile = {
  job: string; // 2-3 sentences: what the job is
  day: string; // what the day is like: pace, setting, people
  thrives: string[]; // who does well here
  ask: string[]; // what we still need to ask the owner
  role: string; // closest role
  level: string; // beginner | experienced | senior | ""
  hours: string; // e.g. Full-time, Part-time, "" if not said
  phone?: string; // the owner's phone, when it came from a call-back request
  notes?: string[]; // notes from calls with the owner, newest last
  at: string;
  sig: string;
};
type Store = Record<string, OpeningProfile>;
const KEY = "opening_profiles";

export type CompanyCard = { about: string; at: string; by: string };
const CKEY = "company_cards";
export const companyKey = (name: string | null | undefined) => (name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export async function openingProfiles(): Promise<Store> {
  return getSetting<Store>(KEY, {});
}
export async function openingProfile(id: string): Promise<OpeningProfile | null> {
  return (await openingProfiles())[id] ?? null;
}
async function saveProfile(id: string, p: OpeningProfile) {
  const all = await openingProfiles();
  all[id] = p;
  await setSetting(KEY, all);
}

export async function companyCards(): Promise<Record<string, CompanyCard>> {
  return getSetting<Record<string, CompanyCard>>(CKEY, {});
}
export async function companyCard(company: string | null | undefined): Promise<CompanyCard | null> {
  const k = companyKey(company);
  return k ? ((await companyCards())[k] ?? null) : null;
}
export async function setCompanyCard(company: string, about: string, by: string) {
  const k = companyKey(company);
  if (!k) return;
  const all = await companyCards();
  if (about.trim()) all[k] = { about: about.trim().slice(0, 2000), at: new Date().toISOString(), by };
  else delete all[k];
  await setSetting(CKEY, all);
}

// What changes the write-up: if none of this changed, there's nothing to rewrite.
export const profileSig = (p: Position, notes: string[] = []) =>
  [p.title, p.company, p.location, p.work_mode, p.salary_min, p.salary_max, p.level, p.role_category, p.starts, p.needs, (p.description ?? "").length, notes.length].join("|");

function parseJSON<T>(raw: string): T | null {
  try {
    return JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as T;
  } catch {
    return null;
  }
}

// Write (or rewrite) the opening's profile, and update the company's card with anything new.
export async function writeOpeningProfile(p: Position): Promise<OpeningProfile | null> {
  const prev = await openingProfile(p.id);
  const notes = prev?.notes ?? [];
  const card = await companyCard(p.company);
  const facts = [
    `Title: ${p.title}`,
    p.company && `Company: ${p.company}`,
    p.location && `Location: ${p.location}`,
    p.work_mode && `Work setting: ${p.work_mode}`,
    (p.salary_min || p.salary_max) && `Pay: ${p.salary_min ?? "?"} to ${p.salary_max ?? "?"} a year`,
    p.level && `Level: ${p.level}`,
    p.role_category && `Role: ${p.role_category}`,
    p.industry && `Industry: ${p.industry}`,
    p.starts && `Start: ${p.starts}`,
    p.needs && `What it needs most in a person: ${p.needs}`,
    p.description && `About the job (as given to us):\n${p.description.slice(0, 4000)}`,
    notes.length && `Notes from our calls with the owner:\n${notes.join("\n")}`,
    card && `What we already know about this company:\n${card.about}`,
  ]
    .filter(Boolean)
    .join("\n");
  const prompt = `You help a small, warm recruiting team keep a private profile for each job opening they know about. Write this opening's profile from what we have below. Some openings are one line; that's fine. Write only what the facts support or what any reasonable person would assume for this kind of job, and say "probably" when you assume. Never invent the company, pay, hours or place.

What we have:
${facts}

Reply with only JSON:
{
  "job": "2 to 3 plain sentences: what this person will actually do",
  "day": "1 to 2 sentences: what the day is likely like — pace (rushed or steady), setting (desk, shop floor, warehouse, in the field, remote), people (customers, a team, mostly alone)",
  "thrives": ["3 short lines: the kind of person who does well in this job — temperament and strengths, not years of experience"],
  "ask": ["the 2 to 5 most useful things we still don't know and should ask the owner, as short questions (e.g. Pay range?). Skip anything already known."],
  "role": "the closest of: ${ROLE_LIST.join(", ")}",
  "level": "beginner, experienced, senior, or empty if unclear",
  "hours": "Full-time, Part-time, or empty if not said",
  "company": "1 to 3 sentences of what this tells us about the COMPANY itself (what they do, size, pace, culture), or empty if nothing new"
}`;
  let out: (OpeningProfile & { company?: string }) | null = null;
  try {
    out = parseJSON<OpeningProfile & { company?: string }>((await askAI(prompt)).text);
  } catch (e) {
    console.error("opening profile", e);
    return null;
  }
  if (!out) return null;
  const prof: OpeningProfile = {
    job: String(out.job ?? "").slice(0, 800),
    day: String(out.day ?? "").slice(0, 600),
    thrives: (Array.isArray(out.thrives) ? out.thrives : []).map(String).slice(0, 4),
    ask: (Array.isArray(out.ask) ? out.ask : []).map(String).slice(0, 6),
    role: String(out.role ?? ""),
    level: ["beginner", "experienced", "senior"].includes(String(out.level)) ? String(out.level) : "",
    hours: String(out.hours ?? "").slice(0, 40),
    phone: prev?.phone,
    notes,
    at: new Date().toISOString(),
    sig: profileSig(p, notes),
  };
  await saveProfile(p.id, prof);
  // The company card grows with each opening: never overwrite what the team wrote by hand.
  const add = String(out.company ?? "").trim();
  if (p.company && add) {
    if (!card) await setCompanyCard(p.company, add, "auto");
    else if (card.by === "auto" && !card.about.includes(add.slice(0, 40))) await setCompanyCard(p.company, `${card.about} ${add}`.slice(0, 2000), "auto");
  }
  // Fill empty basics on the opening itself, so the facts line and the old matcher have them.
  const fill: Record<string, string> = {};
  if (!p.role_category && prof.role) fill.role_category = prof.role;
  if (!p.level && prof.level) fill.level = prof.level;
  if (Object.keys(fill).length) await db().from("positions").update(fill).eq("id", p.id);
  return prof;
}

// Openings whose profile is missing or out of date.
export async function writePendingProfiles(positions: Position[], max = 3) {
  const all = await openingProfiles();
  let n = 0;
  for (const p of positions) {
    if (n >= max) break;
    const cur = all[p.id];
    if (cur && cur.sig === profileSig(p, cur.notes ?? [])) continue;
    await writeOpeningProfile(p);
    n++;
  }
  return n;
}

// A business owner told us what they're hiring for (call-back request or booked call):
// that's an opening. One per request; the same owner asking twice for the same role is one.
export async function openingFromLead(o: { key: string; role: string; name: string; business?: string | null; phone?: string | null; email?: string | null; ownerId?: string | null }) {
  const role = o.role.trim();
  if (role.length < 3) return null;
  const source = `lead:${o.key}`.slice(0, 120);
  const { data: same } = await db().from("positions").select("id").eq("source", source).limit(1);
  if (same?.length) return same[0].id as string;
  if (o.email) {
    const { data: dup } = await db().from("positions").select("id, title").eq("status", "open").eq("contact_email", o.email.toLowerCase());
    const hit = (dup ?? []).find((d) => String(d.title).toLowerCase() === role.toLowerCase());
    if (hit) return hit.id as string;
  }
  const { data, error } = await db()
    .from("positions")
    .insert({ title: role.slice(0, 200), company: o.business || null, contact_name: o.name || null, contact_email: o.email?.toLowerCase() || null, owner_id: o.ownerId ?? null, source, status: "open", added_by: "auto" })
    .select("*")
    .single();
  if (error || !data) {
    console.error("opening from lead", error);
    return null;
  }
  const p = data as Position;
  if (o.phone) await saveProfile(p.id, { job: "", day: "", thrives: [], ask: [], role: "", level: "", hours: "", phone: o.phone, notes: [], at: "", sig: "" });
  await logActivity("auto", "position_added", { position_id: p.id, title: p.title, from: "owner request" });
  return p.id;
}

// Notes from a call with the owner go onto their open openings, and the profile is rewritten.
export async function addOpeningNote(positionId: string, note: string, by: string) {
  const n = note.trim();
  if (!n) return;
  const all = await openingProfiles();
  const cur = all[positionId] ?? { job: "", day: "", thrives: [], ask: [], role: "", level: "", hours: "", notes: [], at: "", sig: "" };
  const stamp = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  cur.notes = [...(cur.notes ?? []), `${stamp} (${by}): ${n.slice(0, 1500)}`].slice(-12);
  cur.sig = ""; // forces a rewrite
  all[positionId] = cur;
  await setSetting(KEY, all);
}

export async function openingsForContact(email: string | null | undefined): Promise<string[]> {
  if (!email) return [];
  const { data } = await db().from("positions").select("id").eq("status", "open").eq("contact_email", email.toLowerCase());
  return (data ?? []).map((d) => d.id as string);
}
