import { db, logActivity } from "./db";
import { escapeHtml, sendEmail } from "./email";
import { teamUrl } from "./format";
import { roomTranscript } from "./googleCalls";
import { ROLE_LIST } from "./writingHelp";

// After an onboarding call: read the transcript Google made, have AI draft the
// candidate's profile, and fill in whatever the rep hasn't written yet. The rep
// reviews it, edits, and lists them.

export type CallDraft = {
  headline: string;
  summary: string;
  highlights: string[];
  full_profile: string;
  roles: string[];
  private_notes: string;
  made_at: string;
};

const MODELS = ["claude-sonnet-5-5", "claude-sonnet-4-5"];

async function askAI(prompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("The AI key isn't set up yet.");
  let last = "";
  for (const model of MODELS) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 2000, messages: [{ role: "user", content: prompt }] }),
    });
    if (r.ok) {
      const j = (await r.json()) as { content: { type: string; text?: string }[] };
      return j.content.map((x) => x.text ?? "").join("");
    }
    last = `${r.status} ${(await r.text()).slice(0, 200)}`;
    if (r.status !== 404 && r.status !== 400) break;
  }
  throw new Error(`The AI didn't answer (${last}).`);
}

function promptFor(name: string, lookingFor: string, transcript: string) {
  return `You help a hiring platform write candidate profiles. A rep just had an onboarding call with a job seeker named ${name}. Below is the transcript.

Write a draft profile from what was actually said. Don't invent facts. Warm, specific, plain English; written for business owners deciding whether to meet this person.

Rules:
- "headline", "summary" and "highlights" are shown to employers BEFORE they know who the candidate is: no names, no employer names, no school names, no exact job titles that identify them.
- "headline": one line, under 90 characters, about what they're great at (e.g. "Bookkeeper who finds the mistake everyone else missed").
- "summary": 2 to 4 sentences: what they've done and where they shine.
- "highlights": 3 to 5 short lines, concrete accomplishments or strengths from the call.
- "full_profile": a fuller paragraph or two, shown only after an employer signs; may mention specifics.
- "roles": up to 3 that fit, chosen from this list: ${ROLE_LIST.join(", ")}.
- If the call doesn't give enough to write an employer-facing field honestly, leave that field as an empty string (or an empty list) rather than writing filler like "details to come". Say what's missing in "private_notes".
- "private_notes": for the team only, short bullet lines starting with "- ": what gives them energy, what drains them, what they want next, pay and schedule hopes, availability, anything to follow up on.

What they said they're looking for when they applied: ${lookingFor || "not given"}

Answer with JSON only, no other text:
{"headline": "...", "summary": "...", "highlights": ["..."], "full_profile": "...", "roles": ["..."], "private_notes": "..."}

Transcript:
${transcript.slice(0, 120000)}`;
}

export async function draftText(name: string, lookingFor: string, transcript: string): Promise<CallDraft> {
  const raw = await askAI(promptFor(name, lookingFor, transcript));
  const j = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
  return {
    headline: String(j.headline ?? "").slice(0, 140),
    summary: String(j.summary ?? ""),
    highlights: Array.isArray(j.highlights) ? j.highlights.map(String).slice(0, 6) : [],
    full_profile: String(j.full_profile ?? ""),
    roles: Array.isArray(j.roles) ? j.roles.map(String).filter((r: string) => ROLE_LIST.includes(r)).slice(0, 3) : [],
    private_notes: String(j.private_notes ?? ""),
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
    draft = await draftText(c.full_name, c.application?.looking_for ?? "", transcript);
  } catch (e) {
    return { ok: false, error: (e as Error).message.startsWith("The AI") ? (e as Error).message : "The AI's answer didn't come through right. Try again." };
  }

  // Fill in only what's still empty; never overwrite the rep's own words.
  const update: Record<string, unknown> = { application: { ...(c.application ?? {}), call_draft: JSON.stringify(draft) } };
  if (!c.headline && draft.headline) update.headline = draft.headline;
  if (!c.summary && draft.summary) update.summary = draft.summary;
  if (!(c.highlights ?? []).length && draft.highlights.length) update.highlights = draft.highlights;
  if (!c.full_profile && draft.full_profile) update.full_profile = draft.full_profile;
  if (!c.role_category && draft.roles[0]) update.role_category = draft.roles[0];
  if (draft.private_notes) update.admin_notes = [c.admin_notes, `From the call (${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}):\n${draft.private_notes}`].filter(Boolean).join("\n\n");
  await db().from("candidates").update(update).eq("id", candidateId);
  await logActivity("system", "call_draft_made", { candidate_id: candidateId, call_id: call.id });

  if (opts.notifyRep && call.staff?.active) {
    await sendEmail({
      to: call.staff.email,
      subject: `${c.full_name}'s profile is drafted from your call`,
      html: `<p>Hi ${escapeHtml((call.staff.full_name ?? "").split(" ")[0] || "there")},</p>
<p>We turned your call with <strong>${escapeHtml(c.full_name)}</strong> into a first draft of their profile, plus private notes for the team.</p>
<p>Give it a read, make it yours, and click <strong>List now</strong>.</p>
<p><a href="${teamUrl()}/admin/candidates/${candidateId}">Open their profile</a></p>`,
    });
  }
  return { ok: true, draft };
}

// From the daily run: draft every finished recorded call that doesn't have one yet.
export async function draftFinishedCalls() {
  if (!process.env.ANTHROPIC_API_KEY) return { drafted: 0 };
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data } = await db()
    .from("onboarding_calls")
    .select("*")
    .neq("status", "cancelled")
    .lte("ends_at", new Date().toISOString())
    .gte("ends_at", since);
  let drafted = 0;
  for (const k of (data ?? []) as { id: string; candidate_id: string; meet_space?: string | null }[]) {
    if (!k.meet_space) continue;
    const { count } = await db().from("activity_log").select("id", { count: "exact", head: true }).eq("action", "call_draft_made").eq("details->>call_id", k.id);
    if (count) continue;
    const r = await draftFromCall(k.candidate_id, { notifyRep: true }).catch(() => null);
    if (r?.ok) drafted++;
  }
  return { drafted };
}
