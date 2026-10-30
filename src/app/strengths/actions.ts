"use server";

import { Answers, complete, Result, score, STRENGTHS } from "@/lib/assessment";
import { logActivity } from "@/lib/db";
import { emailAdmin, escapeHtml } from "@/lib/email";
import { teamUrl } from "@/lib/format";
import { allow, SLOW_DOWN } from "@/lib/throttle";

export async function submitAssessment(name: string, email: string, answers: Answers): Promise<{ result?: Result; error?: string }> {
  name = String(name ?? "").trim().slice(0, 80);
  email = String(email ?? "").trim().slice(0, 120);
  if (!name) return { error: "Please add your name." };
  if (!answers || !complete(answers)) return { error: "A few questions still need an answer." };
  if (!(await allow("assessment", 8, 60))) return { error: SLOW_DOWN };

  const result = score(answers);
  await logActivity("assessment", "assessment_taken", { name, email, answers, result });

  const top = result.top.map((k) => STRENGTHS[k].name).join(" + ");
  await emailAdmin(
    `${name} took the strengths assessment: ${top}`,
    `<p><strong>${escapeHtml(name)}</strong>${email ? ` (${escapeHtml(email)})` : ""} just took the strengths assessment.</p>
<p><strong>Natural strengths:</strong> ${top}<br>
<strong>Also strong:</strong> ${result.next.map((k) => STRENGTHS[k].name).join(", ")}<br>
<strong>Drains them:</strong> ${result.low.map((k) => STRENGTHS[k].name).join(", ")}<br>
<strong>Could shine in:</strong> ${result.roles.join(", ")}</p>
<p><strong>Work style:</strong> ${result.style.map((s) => s.text).join("; ")}</p>
<p>${result.ranked.map((r) => `${STRENGTHS[r.key].name} ${r.score}`).join(" · ")}</p>
<p><a href="${teamUrl()}/admin/assessments">See all results</a></p>`,
    email ? { replyTo: email } : {},
  ).catch(() => null);

  return { result };
}
