import { cleanLanguages } from "./languages";
import { ANONYMITY_RULES } from "./anonymity";
import { db, logActivity } from "./db";
import { escapeHtml, sendEmail } from "./email";
import { teamUrl } from "./format";
import { roomTranscript } from "./googleCalls";
import { ROLE_LIST } from "./writingHelp";
import { sourceOrder } from "./repTake";

// After an onboarding call: read the transcript Google made, have AI draft the
// candidate's profile, and fill in whatever the rep hasn't written yet. The rep
// reviews it, edits, and lists them.

export type CallDraft = {
  headline: string;
  summary: string;
  highlights: string[];
  full_profile: string;
  roles: string[];
  languages: string[];
  private_notes: string;
  available?: string;
  made_at: string;
};

const MODELS = ["claude-sonnet-5-5", "claude-sonnet-4-5"];

async function askAI(prompt: string): Promise<{ text: string; stop: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("The AI key isn't set up yet.");
  let last = "";
  for (const model of MODELS) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      // Long calls make long drafts: leave plenty of room so the answer isn't cut off.
      body: JSON.stringify({ model, max_tokens: 8000, messages: [{ role: "user", content: prompt }] }),
    });
    if (r.ok) {
      const j = (await r.json()) as { content: { type: string; text?: string }[]; stop_reason?: string };
      return { text: j.content.map((x) => x.text ?? "").join(""), stop: j.stop_reason ?? "" };
    }
    last = `${r.status} ${(await r.text()).slice(0, 200)}`;
    if (r.status !== 404 && r.status !== 400) break;
  }
  throw new Error(`The AI didn't answer (${last}).`);
}

function promptFor(name: string, lookingFor: string, transcript: string, repTake = "") {
  return `You help a hiring platform write candidate profiles. A rep just had an onboarding call with a job seeker named ${name}. Below is the transcript.

${repTake.trim() ? sourceOrder({ take: repTake, call: true }) : ""}
Write a draft profile from what was actually said. Don't invent facts. Warm, specific, plain English; written for business owners deciding whether to meet this person.

Rules:
- "headline", "summary" and "highlights" are shown to employers BEFORE they know who the candidate is, so they must be anonymous:
${ANONYMITY_RULES}
- "headline": one line, under 90 characters, about what they're great at (e.g. "Bookkeeper who finds the mistake everyone else missed").
- "summary": 2 to 4 sentences: what they've done and where they shine.
- "highlights": 3 to 5 short lines, concrete accomplishments or strengths from the call.
- "full_profile": a fuller paragraph or two, shown only after an employer signs; may mention specifics.
- "roles": up to 3 that fit, chosen from this list: ${ROLE_LIST.join(", ")}.
- If the call doesn't give enough to write an employer-facing field honestly, leave that field as an empty string (or an empty list) rather than writing filler like "details to come". Say what's missing in "private_notes".
- "languages": languages they said they speak fluently, e.g. ["English", "Yiddish"]. Only what was actually said; empty list if it never came up.
- "available": when they can start, only if they said it: "now", "2weeks", "month", or "" if it never came up.
- "private_notes": for the team only, short bullet lines starting with "- ": what gives them energy, what drains them, what they want next, pay and schedule hopes, availability, anything to follow up on.

What they said they're looking for when they applied: ${lookingFor || "not given"}

Answer with JSON only, no other text:
{"headline": "...", "summary": "...", "highlights": ["..."], "full_profile": "...", "roles": ["..."], "languages": ["..."], "available": "", "private_notes": "..."}

Transcript:
${transcript.slice(0, 120000)}`;
}

export async function draftText(name: string, lookingFor: string, transcript: string, repTake = ""): Promise<CallDraft> {
  // One quiet retry if the answer comes back cut off or garbled.
  let j: Record<string, unknown> | null = null;
  let why = "";
  for (let attempt = 0; attempt < 2 && !j; attempt++) {
    const { text, stop } = await askAI(promptFor(name, lookingFor, transcript, repTake));
    try {
      j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    } catch {
      why = `stop=${stop} length=${text.length}`;
    }
  }
  if (!j) {
    await logActivity("system", "call_draft_failed", { name, why });
    throw new Error("draft parse");
  }
  return {
    headline: String(j.headline ?? "").slice(0, 140),
    summary: String(j.summary ?? ""),
    highlights: Array.isArray(j.highlights) ? j.highlights.map(String).slice(0, 6) : [],
    full_profile: String(j.full_profile ?? ""),
    roles: Array.isArray(j.roles) ? j.roles.map(String).filter((r: string) => ROLE_LIST.includes(r)).slice(0, 3) : [],
    languages: cleanLanguages(Array.isArray(j.languages) ? j.languages : []),
    private_notes: String(j.private_notes ?? ""),
    available: ["now", "2weeks", "month"].includes(String(j.available ?? "")) ? String(j.available) : "",
    made_at: new Date().toISOString(),
  };
}

export async function draftFromCall(candidateId: string, opts: { notifyRep?: boolean } = {}): Promise<{ ok: true; draft: CallDraft } | { ok: false; error: string }> {
  const { data: c } = await db().from("candidates").select("*").eq("id", candidateId).maybeSingle();
  if (!c) return { ok: false, error: "Couldn't find this candidate." };
  const { data: calls } = await db()
    .from("onboarding_calls")
    .select("*, staff(email, full_name, active)")
    .eq("candidate_id", candidateId)
    .neq("status", "cancelled")
    .order("starts_at", { ascending: false });
  const call = ((calls ?? []) as { id: string; meet_space?: string | null; staff: { email: string; full_name: string | null; active: boolean } }[]).find((k) => k.meet_space);
  if (!call?.meet_space) return { ok: false, error: "Their call wasn't held in a recorded room." };

  let transcript: string | null;
  try {
    transcript = await roomTranscript(call.meet_space);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (!transcript) return { ok: false, error: "Google is still working on the transcript. Try again in a few minutes." };

  let draft: CallDraft;
  try {
    draft = await draftText(c.full_name, c.application?.looking_for ?? "", transcript, c.application?.rep_take ?? "");
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    await logActivity("system", "call_draft_failed", { candidate_id: candidateId, error: msg.slice(0, 300), transcript_chars: transcript.length });
    return { ok: false, error: msg.startsWith("The AI") ? msg : "The AI's answer didn't come through right. Try again." };
  }

  // Fill in only what's still empty; never overwrite the rep's own words. Re-read first:
  // the AI takes a while, and the rep may have typed (or saved their take) meanwhile.
  {
    const { data: fresh } = await db().from("candidates").select("*").eq("id", candidateId).maybeSingle();
    if (fresh) Object.assign(c, fresh);
  }
  const update: Record<string, unknown> = {
    application: { ...(c.application ?? {}), call_draft: JSON.stringify(draft), ...(!c.application?.available && draft.available ? { available: draft.available } : {}) },
  };
  if (!c.headline && draft.headline) update.headline = draft.headline;
  if (!c.summary && draft.summary) update.summary = draft.summary;
  if (!(c.highlights ?? []).length && draft.highlights.length) update.highlights = draft.highlights;
  if (!c.full_profile && draft.full_profile) update.full_profile = draft.full_profile;
  if (!(c.languages ?? []).length && draft.languages?.length) update.languages = draft.languages;
  if (!c.role_category && draft.roles[0]) update.role_category = draft.roles[0];
  // Call notes go in once: a second draft (pressing "Draft it again") doesn't stack another copy.
  if (draft.private_notes && !String(c.admin_notes ?? "").includes("From the call (")) update.admin_notes = [c.admin_notes, `From the call (${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}):\n${draft.private_notes}`].filter(Boolean).join("\n\n");
  await db().from("candidates").update(update).eq("id", candidateId);
  await logActivity("system", "call_draft_made", { candidate_id: candidateId, call_id: call.id });

  if (opts.notifyRep && call.staff?.active) {
    await sendEmail({
      to: call.staff.email,
      subject: `${c.full_name}'s profile is drafted from your call`,
      html: `<p>Hi ${escapeHtml((call.staff.full_name ?? "").split(" ")[0] || "there")},</p>
<p>We turned your call with <strong>${escapeHtml(c.full_name)}</strong> into a first draft of their profile, plus private notes for the team.</p>
${notesHtml(draft.private_notes)}
${draft.headline ? `<p style="margin:16px 0 4px;font-weight:700">Draft headline</p><p style="margin:0">${escapeHtml(draft.headline)}</p>` : ""}
<p style="margin-top:16px">Give the profile a read, make it yours, and click <strong>List now</strong>.</p>
<p><a href="${teamUrl()}/admin/candidates/${candidateId}" style="display:inline-block;padding:11px 20px;border-radius:999px;background:#17213a;color:#fff;text-decoration:none;font-weight:700">Open their profile</a></p>`,
    });
  }
  return { ok: true, draft };
}

// The private notes as an easy-to-read list, for the rep's email.
function notesHtml(notes: string) {
  const lines = notes
    .split("\n")
    .map((l) => l.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 14);
  if (!lines.length) return "";
  return `<div style="margin:16px 0;padding:14px 16px;border-radius:12px;background:#fff8e1;border:1px solid #f3d27a"><p style="margin:0 0 8px;font-weight:700">Your notes from the call (team only)</p><ul style="margin:0;padding-left:20px">${lines.map((l) => `<li style="margin:0 0 4px">${escapeHtml(l)}</li>`).join("")}</ul></div>`;
}

// From the daily run (last 7 days) and the every-10-minutes run (last few hours):
// draft every finished recorded call that doesn't have one yet, and tell the rep.
export async function draftFinishedCalls(opts: { withinHours?: number } = {}) {
  if (!process.env.ANTHROPIC_API_KEY) return { drafted: 0 };
  const since = new Date(Date.now() - (opts.withinHours ? opts.withinHours * 3600e3 : 7 * 864e5)).toISOString();
  const { data } = await db()
    .from("onboarding_calls")
    .select("*")
    .not("status", "in", "(cancelled,no_show)")
    .lte("ends_at", new Date().toISOString())
    .gte("ends_at", since);
  let drafted = 0;
  for (const k of (data ?? []) as { id: string; candidate_id: string; meet_space?: string | null }[]) {
    if (!k.meet_space) continue;
    const { count } = await db().from("activity_log").select("id", { count: "exact", head: true }).eq("action", "call_draft_made").eq("details->>call_id", k.id);
    if (count) continue;
    // A candidate with two rooms (a duplicate call) gets one draft, not one a day:
    // skip if this candidate already got a draft after this call ended.
    const { count: later } = await db()
      .from("activity_log")
      .select("id", { count: "exact", head: true })
      .eq("action", "call_draft_made")
      .eq("details->>candidate_id", k.candidate_id)
      .gte("at", (k as { ends_at?: string }).ends_at ?? since);
    if (later) continue;
    const r = await draftFromCall(k.candidate_id, { notifyRep: true }).catch(() => null);
    if (r?.ok) drafted++;
  }
  return { drafted };
}
