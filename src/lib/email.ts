import { Resend } from "resend";
import { db, logActivity } from "./db";

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Sends an email through Resend. Without RESEND_API_KEY (e.g. on a laptop) it
// prints the email to the server log instead, so nothing breaks while testing.
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer }[];
}) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!key || !from) {
    console.log(`[email not sent: RESEND_API_KEY/EMAIL_FROM missing] to=${opts.to} subject=${opts.subject}\n${opts.html}`);
    const missing = [!key && "RESEND_API_KEY", !from && "EMAIL_FROM"].filter(Boolean).join(" and ");
    await logActivity("system", "email_failed", { to: opts.to, subject: opts.subject, error: `${missing} is missing in Vercel` });
    return { ok: false, error: `${missing} is missing in Vercel` };
  }
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: wrap(opts.html),
      replyTo: opts.replyTo ?? process.env.ADMIN_EMAIL,
      attachments: opts.attachments,
    });
    if (error) {
      console.error("email failed", error);
      const msg = `${error.name ?? "error"}: ${error.message}`;
      await logActivity("system", "email_failed", { to: opts.to, subject: opts.subject, error: msg });
      return { ok: false, error: msg };
    }
    await logActivity("system", "email_ok", { to: opts.to });
    return { ok: true };
  } catch (e) {
    console.error("email failed", e);
    const msg = e instanceof Error ? e.message : String(e);
    await logActivity("system", "email_failed", { to: opts.to, subject: opts.subject, error: msg });
    return { ok: false, error: msg };
  }
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

function wrap(body: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1c2433;max-width:560px">${body}</div>`;
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
