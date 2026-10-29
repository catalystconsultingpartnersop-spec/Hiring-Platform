"use server";

import { redirect } from "next/navigation";
import { Candidate, db, logActivity } from "@/lib/db";
import { emailAdmin, escapeHtml, sendEmail } from "@/lib/email";
import { brandName, candidateUrl, teamUrl } from "@/lib/format";
import { repFor } from "@/lib/notify";
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
    await sendEmail({
      to: email,
      subject: `Your page at ${brandName()}`,
      html: `<p>Hi ${escapeHtml(cand.full_name.split(" ")[0])},</p>
<p>Here's your link. It shows where things stand, how your profile looks to employers, and how to reach your rep.</p>
<p style="margin:18px 0"><a href="${link}" style="display:inline-block;background:#f2b300;color:#17213a;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Open my page</a></p>
<p style="color:#4a5570;font-size:13px">The link works once and expires in an hour. After that, you'll stay signed in on this device. If you didn't ask for this, you can ignore it.</p>`,
    });
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
