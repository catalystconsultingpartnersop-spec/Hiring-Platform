"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { db, logActivity } from "@/lib/db";
import { requireStaff, staffActor } from "@/lib/session";
import { allow, SLOW_DOWN } from "@/lib/throttle";
import { setMatchHidden } from "@/lib/matchHidden";
import { POSITION_FIELDS, readJobPost, type PositionDraft } from "@/lib/positions";

export async function fillFromPost(text: string): Promise<{ draft?: PositionDraft; error?: string }> {
  const me = await requireStaff();
  if (!text.trim()) return { error: "Paste the job post first." };
  if (!(await allow(`jobpost:${me.id ?? me.email}`, 10, 60))) return { error: SLOW_DOWN };
  const r = await readJobPost(text);
  return "error" in r ? { error: r.error as string } : { draft: r };
}

const toInt = (v: string) => {
  const n = Number(v.replace(/[$,\s]/g, "").replace(/k$/i, "000"));
  return v.trim() && Number.isFinite(n) ? Math.round(n) : null;
};

export async function savePosition(id: string | null, _prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const me = await requireStaff();
  const get = (k: string) => String(form.get(k) ?? "").trim();
  if (!get("title")) return { error: "Give the position a title." };
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const f of POSITION_FIELDS) {
    if (f === "salary_min" || f === "salary_max") row[f] = toInt(get(f));
    else row[f] = get(f).slice(0, f === "description" ? 4000 : 300) || null;
  }
  let posId = id;
  if (id) {
    const { error } = await db().from("positions").update(row).eq("id", id);
    if (error) return { error: `Couldn't save: ${error.message}` };
  } else {
    const { data, error } = await db()
      .from("positions")
      .insert({ ...row, source: "manual", added_by: staffActor(me) })
      .select("id")
      .single();
    if (error || !data) return { error: `Couldn't save: ${error?.message ?? "unknown"}` };
    posId = data.id as string;
    await logActivity(staffActor(me), "position_added", { position_id: posId, title: row.title });
  }
  // Write up the opening and find its matches, right after the page answers.
  const pid = posId!;
  after(async () => {
    const { getPosition } = await import("@/lib/positions");
    const p = await getPosition(pid);
    if (!p) return;
    await (await import("@/lib/openings")).writeOpeningProfile(p).catch(() => null);
    await (await import("@/lib/aiMatch")).runMatch(p).catch(() => null);
  });
  revalidatePath("/admin/matches");
  redirect(`/admin/matches/${posId}${id ? "?saved=1" : ""}`);
}

export async function setPositionStatus(id: string, status: "open" | "closed") {
  const me = await requireStaff();
  await db().from("positions").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  await logActivity(staffActor(me), status === "closed" ? "position_closed" : "position_reopened", { position_id: id });
  revalidatePath("/admin/matches");
  redirect(status === "closed" ? "/admin/matches?closed=1" : `/admin/matches/${id}`);
}

// "Not a fit" on one candidate for one position, and the way back.
export async function markNotAFit(positionId: string, candidateId: string, hide: boolean, form?: FormData) {
  const me = await requireStaff();
  const reason = String(form?.get?.("reason") ?? "").trim();
  await setMatchHidden(positionId, candidateId, hide, me.name || me.email, reason || undefined);
  await logActivity(staffActor(me), hide ? "match_removed" : "match_restored", { position_id: positionId, candidate_id: candidateId });
  revalidatePath("/admin/matches");
  revalidatePath(`/admin/matches/${positionId}`);
  revalidatePath(`/admin/candidates/${candidateId}`);
}

// The company's card: what the business is like, used for every opening there.
export async function saveCompanyCard(positionId: string, company: string, form: FormData) {
  const me = await requireStaff();
  const { setCompanyCard, polishCompanyNotes } = await import("@/lib/openings");
  const about = await polishCompanyNotes(company, String(form.get("about") ?? ""));
  await setCompanyCard(company, about, me.name || me.email);
  revalidatePath(`/admin/matches/${positionId}`);
}

// A note from talking to the owner: rewrites the profile and the matches.
export async function addNote(positionId: string, form: FormData) {
  const me = await requireStaff();
  const note = String(form.get("note") ?? "").trim();
  if (!note) return;
  const { addOpeningNote } = await import("@/lib/openings");
  await addOpeningNote(positionId, note, (me.name || me.email).split(" ")[0]);
  after(async () => {
    const { getPosition } = await import("@/lib/positions");
    const p = await getPosition(positionId);
    if (!p) return;
    await (await import("@/lib/openings")).writeOpeningProfile(p).catch(() => null);
    await (await import("@/lib/aiMatch")).runMatch(p).catch(() => null);
  });
  revalidatePath(`/admin/matches/${positionId}`);
}

// "Check again now": rewrite the profile and rerun the matching.
export async function rematch(positionId: string) {
  await requireStaff();
  const { getPosition } = await import("@/lib/positions");
  const p = await getPosition(positionId);
  if (!p) return;
  await (await import("@/lib/openings")).writeOpeningProfile(p).catch(() => null);
  await (await import("@/lib/aiMatch")).runMatch(p).catch(() => null);
  revalidatePath(`/admin/matches/${positionId}`);
}

// "Send to owner": the site writes the message; the rep sends it (text from their phone,
// or we email it when we have the owner's email). Logged, so the match is tracked.
export async function sendMatch(positionId: string, candidateId: string): Promise<{ error?: string; text?: string; phone?: string; emailed?: boolean; link?: string }> {
  const me = await requireStaff();
  const { getPosition } = await import("@/lib/positions");
  const p = await getPosition(positionId);
  if (!p) return { error: "That opening is gone." };
  const { data: c } = await db().from("candidates").select("id, headline, status").eq("id", candidateId).maybeSingle();
  if (!c || c.status !== "listed") return { error: "That candidate isn't listed right now." };
  const { refCode, siteUrl } = await import("@/lib/format");
  const { refSlug } = await import("@/lib/shareKit");
  const { openingProfile } = await import("@/lib/openings");
  const first = (n: string | null | undefined) => (n ?? "").trim().split(/\s+/)[0] || "";
  const slug = refSlug(first(me.name) || me.email.split("@")[0]);
  const link = `${siteUrl()}/c/${refCode(candidateId)}?${slug ? `r=${slug}&` : ""}o=${positionId.slice(0, 8)}`;
  const head = String(c.headline ?? "someone we met");
  const text = `Hi ${first(p.contact_name) || "there"}, it's ${first(me.name)} from The Candidate Collection. For your ${p.title.toLowerCase()} opening, I think you'd want to meet this person: ${head.charAt(0).toLowerCase() + head.slice(1)}. Here's the profile: ${link}`;
  let emailed = false;
  if (p.contact_email) {
    const { sendEmail, escapeHtml } = await import("@/lib/email");
    const { kit } = await import("@/lib/emailKit");
    const r = await sendEmail({
      to: p.contact_email,
      audience: "owner",
      replyTo: me.email,
      subject: `For your ${p.title} opening`,
      html:
        kit.hi(p.contact_name || "there") +
        kit.p(`For your ${escapeHtml(p.title.toLowerCase())} opening, ${escapeHtml(first(me.name))} from our team thinks you'd want to meet this person:`) +
        kit.big(escapeHtml(head)) +
        kit.button(link, "See the profile") +
        kit.quiet("To see their name and set up a meeting, sign up and put a card on file. Nothing is charged unless you hire."),
    }).catch(() => ({ ok: false }));
    emailed = !!r?.ok;
  }
  const { logMatchSent } = await import("@/lib/aiMatch");
  await logMatchSent(staffActor(me), positionId, candidateId, p.contact_email || p.contact_name || "");
  // No page refresh here: the rep still needs the "Text it" button on screen.
  return { text, phone: (await openingProfile(positionId))?.phone, emailed, link };
}

// "I think this person fits": any rep can suggest any listed candidate for an opening.
// Credit for a hire stays with the candidate's own rep.
export async function addPick(positionId: string, form: FormData) {
  const me = await requireStaff();
  const candidateId = String(form.get("candidate") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(candidateId)) return;
  const { addManualMatch } = await import("@/lib/openings");
  await addManualMatch(positionId, candidateId, (me.name || me.email).split(" ")[0], String(form.get("why") ?? ""));
  await setMatchHidden(positionId, candidateId, false, me.name || me.email);
  await logActivity(staffActor(me), "match_picked", { position_id: positionId, candidate_id: candidateId });
  revalidatePath(`/admin/matches/${positionId}`);
  revalidatePath("/admin/matches");
  revalidatePath(`/admin/candidates/${candidateId}`);
}
