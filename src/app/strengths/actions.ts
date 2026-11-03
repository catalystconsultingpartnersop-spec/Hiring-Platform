"use server";

import { Answers, baseComplete, MAX_EXTRA, Result, score, TRAITS, validExtra } from "@/lib/assessment";
import { db, logActivity } from "@/lib/db";
import { readSignedToken } from "@/lib/session";
import { repFor } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { emailAdmin, escapeHtml } from "@/lib/email";
import { teamUrl } from "@/lib/format";
import { allow, SLOW_DOWN } from "@/lib/throttle";

export async function submitAssessment(name: string, email: string, answers: Answers, token?: string | null): Promise<{ result?: Result; error?: string }> {
  name = String(name ?? "").trim().slice(0, 80);
  email = String(email ?? "").trim().slice(0, 120);
  if (!name) return { error: "Please add your name." };
  if (!answers || !baseComplete(answers) || !validExtra(answers.extra) || answers.extra.length !== MAX_EXTRA)
    return { error: "A few questions still need an answer." };
  if (!(await allow("assessment", 8, 60))) return { error: SLOW_DOWN };

  const result = score(answers);
  const candidateId = await linkToCandidate(token, email, result);
  await logActivity("assessment", "assessment_taken", { name, email, answers, result, candidate_id: candidateId });

  const label = (ks: string) => ks.split("").map((k) => TRAITS[k as keyof typeof TRAITS].label).join(" + ");
  const [t, m, l] = [result.letters.slice(0, 2), result.letters.slice(2, 4), result.letters.slice(4)];
  await emailAdmin(
    `${name} took the strengths assessment: ${label(t)}`,
    `<p><strong>${escapeHtml(name)}</strong>${email ? ` (${escapeHtml(email)})` : ""} just took the strengths assessment.</p>
<p><strong>Result:</strong> ${t} / ${m} / ${l}<br>
<strong>Natural strengths:</strong> ${label(t)}<br>
<strong>Can do well:</strong> ${label(m)}<br>
<strong>Wears them down:</strong> ${label(l)}</p>
<p>${result.order.map((k) => `${k} ${result.scores[k]}`).join(" · ")}${result.clear ? "" : " · (some close calls)"}</p>
<p><a href="${teamUrl()}/admin/assessments">See all results</a></p>`,
    email ? { replyTo: email } : {},
  ).catch(() => null);

  return { result };
}

// The candidate this result belongs to: from the link we sent them, or their email.
// Their letters fill in on their profile, unless someone already entered them.
async function linkToCandidate(token: string | null | undefined, email: string, result: Result): Promise<string | null> {
  let id = readSignedToken(token, "cand_");
  if (!id && email) {
    const { data } = await db().from("candidates").select("id").ilike("email", email.replace(/[%_]/g, "")).neq("status", "archived").limit(2);
    if (data?.length === 1) id = data[0].id as string;
  }
  if (!id) return null;
  const { data: c } = await db().from("candidates").select("id, full_name, email, working_genius, application").eq("id", id).maybeSingle();
  if (!c) return null;
  const filled = !c.working_genius;
  const app = { ...(c.application ?? {}), strengths: { letters: result.letters, at: new Date().toISOString() } };
  await db()
    .from("candidates")
    .update(filled ? { working_genius: result.letters, application: app } : { application: app })
    .eq("id", id);
  const rep = await repFor(id);
  if (rep?.active) {
    const top = result.order.slice(0, 2).map((k) => TRAITS[k].label).join(" + ");
    await sendEmail({
      to: rep.email,
      subject: `${c.full_name} took the Strengths Assessment: ${top}`,
      html: `<p><strong>${escapeHtml(c.full_name)}</strong> just took our Strengths Assessment.</p>
<p><strong>Natural strengths:</strong> ${escapeHtml(top)}</p>
<p>${filled ? "It's on their profile now." : "Their profile already had a result, so we left it as is. You can switch to this one on their profile."}</p>
<p><a href="${teamUrl()}/admin/candidates/${id}">Open their profile</a></p>`,
      replyTo: c.email,
    }).catch(() => null);
  }
  return id;
}
