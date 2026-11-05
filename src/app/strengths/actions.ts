"use server";

import { Answers, baseComplete, MAX_EXTRA, Result, score, TRAITS, validExtra } from "@/lib/assessment";
import { db, logActivity } from "@/lib/db";
import { readSignedToken, signedToken } from "@/lib/session";
import { COMPANY_TZ, formatInZone } from "@/lib/time";
import { repFor } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { emailAdmin, escapeHtml } from "@/lib/email";
import { candidateUrl, teamUrl } from "@/lib/format";
import { allow, SLOW_DOWN } from "@/lib/throttle";

export async function submitAssessment(name: string, email: string, answers: Answers, token?: string | null): Promise<{ result?: Result; next?: NextStep; error?: string }> {
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

  const next = await nextStep(candidateId);
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) await emailResult(name, email, result, next).catch(() => null);
  return { result, next };
}

// What happens after the assessment, so they always know their next step.
export type NextStep =
  | { kind: "call"; when: string; rep: string; join: string | null; manage: string }
  | { kind: "book"; url: string }
  | { kind: "after_call"; rep: string }
  | { kind: "listed" }
  | { kind: "apply"; url: string };

async function nextStep(candidateId: string | null): Promise<NextStep> {
  if (!candidateId) return { kind: "apply", url: `${candidateUrl()}/apply` };
  const { data: c } = await db().from("candidates").select("id, status").eq("id", candidateId).maybeSingle();
  if (c?.status === "listed" || c?.status === "hired") return { kind: "listed" };
  const { data: calls } = await db()
    .from("onboarding_calls")
    .select("id, starts_at, status, meet_link, candidate_time_zone, staff(full_name, meeting_link)")
    .eq("candidate_id", candidateId)
    .neq("status", "cancelled")
    .order("starts_at", { ascending: false })
    .limit(5);
  type Row = { id: string; starts_at: string; status: string; meet_link: string | null; candidate_time_zone: string | null; staff: { full_name: string | null; meeting_link: string | null } | null };
  const rows = (calls ?? []) as unknown as Row[];
  const now = Date.now();
  const upcoming = rows.filter((k) => Date.parse(k.starts_at) > now - 60 * 60e3).at(-1);
  const repFirst = (k: Row) => (k.staff?.full_name || "our team").split(" ")[0];
  if (upcoming)
    return {
      kind: "call",
      when: formatInZone(upcoming.starts_at, upcoming.candidate_time_zone ?? COMPANY_TZ),
      rep: repFirst(upcoming),
      join: upcoming.meet_link || upcoming.staff?.meeting_link || null,
      manage: `${candidateUrl()}/call/${signedToken(`call_${upcoming.id}`, 60)}`,
    };
  if (rows.length) return { kind: "after_call", rep: repFirst(rows[0]) };
  return { kind: "book", url: `${candidateUrl()}/apply/book?c=${encodeURIComponent(signedToken(`cand_${candidateId}`, 30))}` };
}

// Their result in their inbox too, with the same next step.
async function emailResult(name: string, email: string, result: Result, next: NextStep) {
  const first = escapeHtml(name.split(/\s+/)[0]);
  const lab = (ks: string[]) => ks.map((k) => TRAITS[k as keyof typeof TRAITS].label).join(" and ");
  const btn = (href: string, label: string) =>
    `<p style="margin:16px 0"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#f1b400;color:#17213a;text-decoration:none;font-weight:800">${label}</a></p>`;
  const nextHtml =
    next.kind === "call"
      ? `<p><strong>What's next:</strong> your call with ${escapeHtml(next.rep)}, <strong>${escapeHtml(next.when)}</strong>. ${escapeHtml(next.rep)} already has your results and will go through them with you. Nothing else to do before then.</p>${next.join ? btn(next.join, "Join link for the call") : ""}<p style="font-size:14px">Need a different time? <a href="${escapeHtml(next.manage)}">Change it here</a>.</p>`
      : next.kind === "book"
        ? `<p><strong>What's next:</strong> pick a time for your free call with our team. Together you'll go through these results and figure out what kind of work fits you best.</p>${btn(next.url, "Pick a time for your call")}`
        : next.kind === "after_call"
          ? `<p><strong>What's next:</strong> ${escapeHtml(next.rep)} has your results and is using them for your profile. We'll be in touch soon. Nothing for you to do right now.</p>`
          : next.kind === "listed"
            ? `<p>We've added this to your profile. Nothing for you to do.</p>`
            : `<p><strong>Want help finding work that fits?</strong> Sign up (it takes two minutes) and book a free call with our team. Use this same email so we can match your results.</p>${btn(next.url, "Get started")}`;
  await sendEmail({
    to: email,
    audience: "candidate",
    subject: `${name.split(/\s+/)[0]}, your strengths: ${lab(result.order.slice(0, 2))}`,
    html: `<p>Hi ${first},</p>
<p>Thanks for taking our Strengths Assessment. Here's how you're wired:</p>
<p><strong>Your natural strengths:</strong> ${lab(result.order.slice(0, 2))}<br>
<strong>You can do these well:</strong> ${lab(result.order.slice(2, 4))}<br>
<strong>These wear you down:</strong> ${lab(result.order.slice(4, 6))}</p>
${nextHtml}`,
  });
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
