import { Resend } from "resend";
import { db, logActivity } from "./db";
import { Audience, layout } from "./emailKit";
import { brandName } from "./format";

// The sender always shows our name, whatever display name EMAIL_FROM carries.
function senderFrom(raw: string, fromName?: string) {
  const address = raw.match(/<([^>]+)>/)?.[1]?.trim() ?? raw.trim();
  const name = fromName ? `${fromName.replace(/[<>"]/g, "")} via ${brandName()}` : brandName();
  return `${name} <${address}>`;
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Sends an email through Resend. Without RESEND_API_KEY (e.g. on a laptop) it
// prints the email to the server log instead, so nothing breaks while testing.
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  audience?: Audience; // whose letterhead and footer: owner, candidate or team
  replyTo?: string;
  attachments?: { filename: string; content: Buffer }[];
  fromName?: string; // shows as "Name via The Candidate Collection"
}) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!key || !from) {
    console.log(`[email not sent: RESEND_API_KEY/EMAIL_FROM missing] to=${opts.to} subject=${opts.subject}\n${opts.html}`);
    const missing = [!key && "RESEND_API_KEY", !from && "EMAIL_FROM"].filter(Boolean).join(" and ");
    await logActivity("system", "email_failed", { to: opts.to, subject: opts.subject, error: `${missing} is missing in Vercel` });
    return { ok: false, error: `${missing} is missing in Vercel` };
  }
  const resend = new Resend(key);
  let lastError = "";
  // Resend allows only a couple of emails per second, and a booking sends
  // three at once (candidate, rep, Heshy). On "too many requests", wait and retry.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { error } = await resend.emails.send({
        from: senderFrom(from, opts.fromName),
        to: opts.to,
        subject: opts.subject,
        html: layout(opts.html, opts.audience ?? "team"),
        replyTo: opts.replyTo ?? process.env.ADMIN_EMAIL,
        attachments: opts.attachments,
      });
      if (!error) {
        await logActivity("system", "email_ok", { to: opts.to, subject: opts.subject });
        return { ok: true };
      }
      lastError = `${error.name ?? "error"}: ${error.message}`;
      const limited = /rate|too many|429/i.test(`${error.name} ${error.message}`);
      if (!limited) break;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      if (!/rate|too many|429/i.test(lastError)) break;
    }
    await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
  }
  console.error("email failed", lastError);
  await logActivity("system", "email_failed", { to: opts.to, subject: opts.subject, error: lastError });
  return { ok: false, error: lastError };
}

export async function emailAdmin(
  subject: string,
  html: string,
  extra: { replyTo?: string; attachments?: { filename: string; content: Buffer }[] } = {},
) {
  const to = process.env.ADMIN_EMAIL;
  if (!to) return { ok: false, error: "ADMIN_EMAIL is missing in Vercel" };
  return sendEmail({ to, subject, html, ...extra });
}


// The most recent email failure in the last day, if any.
export async function lastEmailProblem(): Promise<string | null> {
  try {
    const since = new Date(Date.now() - 864e5).toISOString();
    const { data } = await db()
      .from("activity_log")
      .select("action, details")
      .in("action", ["email_failed", "email_ok"])
      .gte("at", since)
      .order("at", { ascending: false })
      .limit(1);
    const last = data?.[0];
    if (!last || last.action === "email_ok") return null; // working now
    return (last.details as { error?: string } | undefined)?.error ?? null;
  } catch {
    return null;
  }
}
