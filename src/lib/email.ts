import { Resend } from "resend";

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
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.log(`[email not sent: RESEND_API_KEY/EMAIL_FROM missing] to=${opts.to} subject=${opts.subject}\n${opts.html}`);
    return { ok: false };
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
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("email failed", e);
    return { ok: false };
  }
}

export async function emailAdmin(
  subject: string,
  html: string,
  extra: { replyTo?: string; attachments?: { filename: string; content: Buffer }[] } = {},
) {
  const to = process.env.ADMIN_EMAIL;
  if (!to) return { ok: false };
  return sendEmail({ to, subject, html, ...extra });
}

function wrap(body: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1c2433;max-width:560px">${body}</div>`;
}
