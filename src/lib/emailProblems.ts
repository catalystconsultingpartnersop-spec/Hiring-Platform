import { createHmac, timingSafeEqual } from "crypto";
import { db, logActivity } from "./db";
import { emailAdmin, escapeHtml } from "./email";
import { teamUrl } from "./format";
import { getSetting, setSetting } from "./settings";

// Emails that bounced or were blocked. Resend tells us through a webhook; we flag the
// person on the site and tell Heshy right away, so nobody silently stops getting email.

export type EmailProblem = { type: string; at: string; subject: string | null; reason: string | null };
const KEY = "email_problems";

export async function emailProblems(): Promise<Record<string, EmailProblem>> {
  return getSetting<Record<string, EmailProblem>>(KEY, {}).catch(() => ({}));
}

export async function problemFor(email: string | null | undefined): Promise<EmailProblem | null> {
  if (!email) return null;
  return (await emailProblems())[email.trim().toLowerCase()] ?? null;
}

export async function clearEmailProblem(email: string) {
  const all = await emailProblems();
  const k = email.trim().toLowerCase();
  if (!all[k]) return;
  delete all[k];
  await setSetting(KEY, all);
}

// Resend signs webhooks the Svix way: HMAC-SHA256 of "id.timestamp.body" with the secret.
export function verifyResendWebhook(body: string, headers: Headers): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  const id = headers.get("svix-id");
  const ts = headers.get("svix-timestamp");
  const sigs = headers.get("svix-signature");
  if (!secret || !id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 5 * 60) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest();
  return sigs.split(" ").some((part) => {
    const sig = Buffer.from(part.split(",")[1] ?? "", "base64");
    return sig.length === expected.length && timingSafeEqual(sig, expected);
  });
}

const LABEL: Record<string, string> = {
  "email.bounced": "bounced",
  "email.failed": "failed to send",
  "email.suppressed": "was blocked (this address bounced before)",
  "email.complained": "was marked as spam",
};

// Who an address belongs to, so the alert says what to fix and where.
async function whoIs(email: string) {
  const [{ data: s }, { data: c }, { data: o }] = await Promise.all([
    db().from("staff").select("id, full_name").ilike("email", email).limit(1),
    db().from("candidates").select("id, full_name").ilike("email", email).neq("status", "archived").limit(1),
    db().from("owners").select("id, full_name, company").ilike("email", email).limit(1),
  ]);
  if (s?.[0]) return { what: `${s[0].full_name ?? email} (on the team)`, link: `${teamUrl()}/admin/team` };
  if (c?.[0]) return { what: `${c[0].full_name} (candidate)`, link: `${teamUrl()}/admin/candidates/${c[0].id}` };
  if (o?.[0]) return { what: `${o[0].full_name ?? email}${o[0].company ? `, ${o[0].company}` : ""} (client)`, link: `${teamUrl()}/admin/clients` };
  return { what: email, link: null };
}

export async function handleResendEvent(e: { type?: string; data?: { to?: string[] | string; subject?: string; bounce?: { message?: string } } }) {
  const type = e.type ?? "";
  const to = ([] as string[]).concat(e.data?.to ?? []).map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (!to.length) return;
  const all = await emailProblems();

  // Delivered again: whatever was wrong is fixed.
  if (type === "email.delivered") {
    const fixed = to.filter((x) => all[x]);
    if (fixed.length) {
      for (const x of fixed) delete all[x];
      await setSetting(KEY, all);
      await logActivity("system", "email_problem_cleared", { to: fixed });
    }
    return;
  }
  if (!LABEL[type]) return;

  const admin = (process.env.ADMIN_EMAIL ?? "").toLowerCase();
  for (const x of to) {
    const already = all[x] && Date.now() - Date.parse(all[x].at) < 864e5;
    all[x] = { type, at: new Date().toISOString(), subject: e.data?.subject ?? null, reason: e.data?.bounce?.message ?? null };
    await setSetting(KEY, all);
    await logActivity("system", "email_problem", { to: x, type, subject: e.data?.subject ?? null });
    if (already || x === admin) continue; // one alert a day per address, and never about Heshy's own inbox
    const who = await whoIs(x);
    await emailAdmin(
      `Email to ${who.what} didn't arrive`,
      `<p>An email to <strong>${escapeHtml(x)}</strong> ${LABEL[type]}.</p>
<p><strong>Who:</strong> ${escapeHtml(who.what)}${e.data?.subject ? `<br><strong>Email:</strong> ${escapeHtml(e.data.subject)}` : ""}${e.data?.bounce?.message ? `<br><strong>Why:</strong> ${escapeHtml(e.data.bounce.message)}` : ""}</p>
<p><strong>What to do:</strong> check the address is right. If it was a typo, fix it on their page. If the inbox is new or was down, fix it, then remove the address from Resend's blocked list (Resend → Emails → Suppressions), or emails to it stay blocked.</p>
${who.link ? `<p><a href="${who.link}">Open their page</a></p>` : ""}`,
    ).catch(() => null);
  }
}
