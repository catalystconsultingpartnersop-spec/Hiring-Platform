"use server";

import { redirect } from "next/navigation";
import { candidate as candMail } from "@/lib/emails";
import { Candidate, db, logActivity } from "@/lib/db";
import { emailAdmin, escapeHtml, sendEmail } from "@/lib/email";
import { candidateUrl, teamUrl } from "@/lib/format";

import { repFor } from "@/lib/notify";
import { Meeting, Reference, RefRequest } from "@/lib/path";
import { emailBooked, emailCandidateDeclined, emailNeedOtherTimes, emailRefsGiven, emailVerdict } from "@/lib/pathEmails";
import { currentCandidateId, endCandidateSession, hashToken, isOwnerEmail, newLoginToken, startCandidateSession } from "@/lib/session";

export type LinkState = { sent?: string; error?: string };

// Emails a one-time link to the candidate's own page. Says the same thing
// whether or not we have them, so nobody can check who's on file.
export async function requestCandidateLink(_prev: LinkState, form: FormData): Promise<LinkState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email doesn't look quite right." };

  const since = new Date(Date.now() - 3600e3).toISOString();
  const { count } = await db()
    .from("login_tokens")
    .select("token_hash", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", since);
  if ((count ?? 0) >= 5) return { error: "That's a lot of links in one hour. Wait a bit and try again." };

  const { data: cand } = await db()
    .from("candidates")
    .select("id, full_name")
    .ilike("email", email)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (cand) {
    const { token, hash } = newLoginToken();
    await db()
      .from("login_tokens")
      .insert({ token_hash: hash, email, kind: "candidate", next_path: "/me", expires_at: new Date(Date.now() + 60 * 60e3).toISOString() });
    const link = `${candidateUrl()}/me/verify?token=${token}`;
    await sendEmail({ to: email, ...candMail.pageLink({ name: cand.full_name, link }) });
    await logActivity(`candidate:${email}`, "candidate_link_sent");
  }
  return { sent: email };
}

export async function verifyCandidateLink(form: FormData) {
  const token = String(form.get("token") ?? "");
  const now = new Date().toISOString();
  const { data } = await db()
    .from("login_tokens")
    .update({ used_at: now })
    .eq("token_hash", hashToken(token))
    .eq("kind", "candidate")
    .is("used_at", null)
    .gt("expires_at", now)
    .select("email")
    .maybeSingle();
  if (!data) redirect("/me/login?error=expired");
  const { data: cand } = await db()
    .from("candidates")
    .select("id")
    .ilike("email", data.email)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!cand) redirect("/me/login?error=expired");
  await startCandidateSession(cand.id);
  await logActivity(`candidate:${data.email}`, "candidate_signed_in");
  redirect("/me");
}

async function me(): Promise<Candidate> {
  const id = await currentCandidateId();
  if (!id) redirect("/me/login");
  const { data } = await db().from("candidates").select("*").eq("id", id).maybeSingle();
  if (!data || data.status === "archived") redirect("/me/login");
  return data as Candidate;
}

// Tells the rep (and Heshy) about something the candidate did on their page.
async function tellTeam(c: Candidate, subject: string, body: string) {
  const rep = await repFor(c.id);
  const html = `${body}<p><a href="${teamUrl()}/admin/candidates/${c.id}">Open their profile</a></p>`;
  if (rep?.active && !isOwnerEmail(rep.email)) await sendEmail({ to: rep.email, subject, html, replyTo: c.email });
  await emailAdmin(subject, html, { replyTo: c.email });
}

export async function hideMyProfile() {
  const c = await me();
  if (c.status !== "listed") redirect("/me");
  await db().from("candidates").update({ status: "paused", self_paused_at: new Date().toISOString() }).eq("id", c.id);
  await logActivity(`candidate:${c.email}`, "candidate_paused_self");
  await tellTeam(
    c,
    `${c.full_name} paused their profile`,
    `<p><strong>${escapeHtml(c.full_name)}</strong> hid their profile from employers for now, from their own page. They can turn it back on themselves. Worth a friendly check-in.</p>`,
  );
  redirect("/me?done=paused");
}

export async function showMyProfile() {
  const c = await me();
  // Only undo a pause the candidate made themselves; anything else goes through the rep.
  if (c.status !== "paused" || !c.self_paused_at) redirect("/me");
  await db().from("candidates").update({ status: "listed", self_paused_at: null }).eq("id", c.id);
  await logActivity(`candidate:${c.email}`, "candidate_unpaused_self");
  await tellTeam(
    c,
    `${c.full_name} is back on the site`,
    `<p><strong>${escapeHtml(c.full_name)}</strong> turned their profile back on. Employers can see them again.</p>`,
  );
  redirect("/me?done=back");
}

export async function tellUsAJob(form: FormData) {
  const c = await me();
  const where = String(form.get("where") ?? "").trim().slice(0, 300);
  const wasListed = c.status === "listed";
  if (wasListed) await db().from("candidates").update({ status: "paused", self_paused_at: new Date().toISOString() }).eq("id", c.id);
  await logActivity(`candidate:${c.email}`, "candidate_found_job", { where });
  await tellTeam(
    c,
    `${c.full_name} says they found a job`,
    `<p><strong>${escapeHtml(c.full_name)}</strong> told us they found a job${where ? `: <strong>${escapeHtml(where)}</strong>` : "."}</p>
<p>${wasListed ? "Their profile is now hidden from employers." : ""} If it came through one of our clients, check whether a fee is owed.</p>`,
  );
  redirect("/me?done=job");
}

export async function signOutCandidate() {
  await endCandidateSession();
  redirect("/join");
}

// ---------- The hiring path, candidate's side ----------

async function myMeeting(meetingId: string) {
  const c = await me();
  const { data } = await db().from("meetings").select("*, unlocks(id, candidate_id)").eq("id", meetingId).maybeSingle();
  const row = data as (Meeting & { unlocks: { id: string; candidate_id: string } }) | null;
  if (!row || row.unlocks.candidate_id !== c.id) redirect("/me");
  return { c, m: row };
}

export async function pickTime(meetingId: string, form: FormData) {
  const { c, m } = await myMeeting(meetingId);
  const slot = String(form.get("slot") ?? "");
  if (m.status !== "proposed" || !m.slots.includes(slot) || Date.parse(slot) < Date.now()) redirect("/me?done=pick-error#intros");
  const { data } = await db()
    .from("meetings")
    .update({ status: "booked", starts_at: slot, updated_at: new Date().toISOString() })
    .eq("id", m.id)
    .eq("status", "proposed")
    .select("*")
    .maybeSingle();
  if (!data) redirect("/me#intros");
  await logActivity(`candidate:${c.email}`, "time_picked", { meeting: m.id, kind: m.kind });
  try {
    await emailBooked(data as Meeting);
  } catch (e) {
    console.error(e);
  }
  redirect("/me?done=booked#intros");
}

export async function noTimesWork(meetingId: string, form: FormData) {
  const { c, m } = await myMeeting(meetingId);
  if (m.status !== "proposed") redirect("/me#intros");
  const note = String(form.get("note") ?? "").trim().slice(0, 500) || null;
  const { data } = await db()
    .from("meetings")
    .update({ status: "declined", candidate_note: note, updated_at: new Date().toISOString() })
    .eq("id", m.id)
    .select("*")
    .single();
  await logActivity(`candidate:${c.email}`, "asked_other_times", { meeting: m.id });
  try {
    await emailNeedOtherTimes(data as Meeting);
  } catch (e) {
    console.error(e);
  }
  redirect("/me?done=retime#intros");
}

export async function candidateKeepGoing(meetingId: string) {
  const { c, m } = await myMeeting(meetingId);
  const { data } = await db()
    .from("meetings")
    .update({ candidate_verdict: "yes", updated_at: new Date().toISOString() })
    .eq("id", m.id)
    .select("*")
    .single();
  await logActivity(`candidate:${c.email}`, "candidate_keep_going", { meeting: m.id });
  try {
    await emailVerdict(data as Meeting, "candidate", "yes");
  } catch (e) {
    console.error(e);
  }
  redirect("/me?done=yes#intros");
}

// "Not for me": politely decline this employer, at any step.
export async function declineEmployer(unlockId: string, form: FormData) {
  const c = await me();
  const note = String(form.get("note") ?? "").trim().slice(0, 500) || null;
  const { data } = await db()
    .from("unlocks")
    .update({ candidate_declined_at: new Date().toISOString(), candidate_decline_note: note })
    .eq("id", unlockId)
    .eq("candidate_id", c.id)
    .is("candidate_declined_at", null)
    .select("id")
    .maybeSingle();
  if (data) {
    await db().from("meetings").update({ status: "cancelled" }).eq("unlock_id", unlockId).in("status", ["proposed", "declined"]);
    const { data: last } = await db()
      .from("meetings")
      .select("id")
      .eq("unlock_id", unlockId)
      .eq("status", "booked")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last) await db().from("meetings").update({ candidate_verdict: "no" }).eq("id", last.id).is("candidate_verdict", null);
    try {
      await emailCandidateDeclined(unlockId, note);
    } catch (e) {
      console.error(e);
    }
  }
  redirect("/me?done=declined#intros");
}

export async function sendReferences(requestId: string, form: FormData) {
  const c = await me();
  const { data: req } = await db().from("reference_requests").select("*, unlocks(id, candidate_id)").eq("id", requestId).maybeSingle();
  const row = req as (RefRequest & { unlocks: { id: string; candidate_id: string } }) | null;
  if (!row || row.unlocks.candidate_id !== c.id) redirect("/me");
  const get = (k: string) => form.getAll(k).map((v) => String(v).trim().slice(0, 200));
  const names = get("ref_name");
  const relations = get("ref_relation");
  const phones = get("ref_phone");
  const emails = get("ref_email");
  const refs: Reference[] = names
    .map((name, i) => ({ name, relation: relations[i] ?? "", phone: phones[i] ?? "", email: emails[i] ?? "" }))
    .filter((r) => r.name && (r.phone || r.email));
  if (!refs.length) redirect("/me?done=refs-error#intros");
  await db().from("reference_requests").update({ refs, given_at: new Date().toISOString() }).eq("id", requestId);
  await logActivity(`candidate:${c.email}`, "references_given", { count: refs.length });
  try {
    await emailRefsGiven(row.unlocks.id, refs);
  } catch (e) {
    console.error(e);
  }
  redirect("/me?done=refs#intros");
}
