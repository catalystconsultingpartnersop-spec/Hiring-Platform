"use server";

import { logActivity } from "@/lib/db";
import { escapeHtml as e, sendEmail } from "@/lib/email";
import { allow } from "@/lib/throttle";

// A page broke for a visitor. Keep a record, and tell Heshy (a few an hour at
// most per visitor, so one bad page can't fill his inbox).
export async function reportProblem(where: string, what: string, digest?: string) {
  const page = String(where).slice(0, 200);
  const message = String(what).slice(0, 400);
  if (!(await allow("page_problem", 3, 60))) return;
  await logActivity("system", "page_problem", { page, message, digest: digest ?? null });
  const to = process.env.ADMIN_EMAIL;
  if (!to) return;
  await sendEmail({
    to,
    subject: `A page broke: ${page}`,
    html: `<p>A visitor hit an error page.</p><p><b>Page:</b> ${e(page)}<br><b>What it said:</b> ${e(message)}${digest ? `<br><b>Code:</b> ${e(digest)}` : ""}</p><p>Forward this to Claude to look into it.</p>`,
    audience: "team",
  });
}
