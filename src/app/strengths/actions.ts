"use server";

import { Answers, baseComplete, MAX_EXTRA, Result, score, TRAITS, validExtra } from "@/lib/assessment";
import { logActivity } from "@/lib/db";
import { emailAdmin, escapeHtml } from "@/lib/email";
import { teamUrl } from "@/lib/format";
import { allow, SLOW_DOWN } from "@/lib/throttle";

export async function submitAssessment(name: string, email: string, answers: Answers): Promise<{ result?: Result; error?: string }> {
  name = String(name ?? "").trim().slice(0, 80);
  email = String(email ?? "").trim().slice(0, 120);
  if (!name) return { error: "Please add your name." };
  if (!answers || !baseComplete(answers) || !validExtra(answers.extra) || answers.extra.length !== MAX_EXTRA)
    return { error: "A few questions still need an answer." };
  if (!(await allow("assessment", 8, 60))) return { error: SLOW_DOWN };

  const result = score(answers);
  await logActivity("assessment", "assessment_taken", { name, email, answers, result });

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
