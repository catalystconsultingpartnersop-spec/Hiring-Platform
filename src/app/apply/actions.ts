"use server";

import { db, logActivity } from "@/lib/db";
import { emailAdmin, escapeHtml, sendEmail } from "@/lib/email";
import { brandName, siteUrl } from "@/lib/format";

export type ApplyState = { ok?: boolean; error?: string; fields?: Record<string, string> };

const MAX_RESUME = 4 * 1024 * 1024;
const RESUME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

const FIELDS = [
  ["looking_for", "What kind of work they want"],
  ["experience", "Experience level"],
  ["location", "Where they live"],
  ["work_mode", "Work setting"],
  ["salary", "Salary they're looking for"],
  ["about", "About them"],
  ["working_genius", "Working Genius result"],
  ["never_show_to", "Never show them to"],
] as const;

export async function submitApplication(_prev: ApplyState, form: FormData): Promise<ApplyState> {
  const get = (k: string) => String(form.get(k) ?? "").trim().slice(0, 4000);
  const full_name = get("full_name");
  const email = get("email").toLowerCase();
  const phone = get("phone");
  const linkedinRaw = get("linkedin_url");
  const linkedin = linkedinRaw && !/^https?:\/\//i.test(linkedinRaw) ? `https://${linkedinRaw}` : linkedinRaw;

  // Hand back what they typed so a mistake never wipes the form.
  const fields: Record<string, string> = { full_name, email, phone, linkedin_url: linkedin };
  for (const [k] of FIELDS) fields[k] = get(k);
  const fail = (error: string): ApplyState => ({ error, fields });

  if (form.get("website")) return { ok: true }; // spam trap
  if (full_name.length < 2) return fail("Enter your full name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email address.");
  if (!get("looking_for")) return fail("Tell us what kind of work you want.");
  if (form.get("consent") !== "on") return fail("Tick the box at the bottom to agree to be listed.");

  const resume = form.get("resume");
  const hasResume = resume instanceof File && resume.size > 0;
  if (hasResume) {
    if (resume.size > MAX_RESUME) return fail("The resume file is over 4 MB. Try a smaller PDF, or leave it off for now.");
    if (!RESUME_TYPES[resume.type]) return fail("Upload the resume as a PDF or Word file, or leave it off for now.");
  }
  const resumeBuf = hasResume ? Buffer.from(await resume.arrayBuffer()) : null;
  const resumeExt = hasResume ? RESUME_TYPES[resume.type] : null;

  const application: Record<string, string> = {};
  for (const [k] of FIELDS) application[k] = get(k);

  // 1. Save to the database.
  let candidateId: string | null = null;
  try {
    const { data, error } = await db()
      .from("candidates")
      .insert({
        status: "applied",
        full_name,
        email,
        phone: phone || null,
        linkedin_url: linkedin || null,
        never_show_to: application.never_show_to || null,
        working_genius: application.working_genius || null,
        application,
        consent_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    candidateId = data.id;
  } catch (e) {
    console.error("application could not be saved to the database", e);
  }

  if (candidateId && resumeBuf) {
    try {
      const path = `${candidateId}/resume.${resumeExt}`;
      const { error } = await db()
        .storage.from("resumes")
        .upload(path, resumeBuf, { contentType: (resume as File).type, upsert: true });
      if (error) throw error;
      await db().from("candidates").update({ resume_path: path }).eq("id", candidateId);
    } catch (e) {
      console.error("resume upload failed", e);
    }
  }
  if (candidateId) await logActivity(`candidate:${email}`, "applied", { candidate_id: candidateId });

  // 2. Email the full application to Heshy. If the database save failed, this
  // email (with the resume attached) is the record, so nothing is ever lost.
  const rows = FIELDS.map(
    ([k, label]) =>
      `<tr><td style="padding:4px 12px 4px 0;color:#4a5570;vertical-align:top">${label}</td><td style="white-space:pre-wrap">${escapeHtml(application[k] || "—")}</td></tr>`,
  ).join("");
  const adminMail = await emailAdmin(
    `New candidate: ${full_name}${candidateId ? "" : " (not saved in the database; details below)"}`,
    `<p><strong>${escapeHtml(full_name)}</strong>, ${escapeHtml(email)}${phone ? `, ${escapeHtml(phone)}` : ""}${linkedin ? `, <a href="${escapeHtml(linkedin)}">LinkedIn</a>` : ""}</p>
<table>${rows}</table>
${candidateId ? `<p><a href="${siteUrl()}/admin/candidates/${candidateId}">Open in admin</a></p>` : "<p><strong>This application couldn't be saved to the site, so this email is the only copy.</strong> The resume, if they sent one, is attached.</p>"}`,
    {
      replyTo: email,
      attachments: resumeBuf ? [{ filename: `${full_name.replace(/[^\w ]/g, "")} resume.${resumeExt}`, content: resumeBuf }] : undefined,
    },
  );

  if (!candidateId && !adminMail.ok) {
    const contact = process.env.ADMIN_EMAIL;
    return fail(
      `We couldn't send your application just now. Please try again in a few minutes${contact ? `, or email it to ${contact}` : ""}.`,
    );
  }

  await sendEmail({
    to: email,
    subject: `We got your application, ${full_name.split(" ")[0]}`,
    html: `<p>Hi ${escapeHtml(full_name.split(" ")[0])},</p>
<p>Thanks for applying to ${escapeHtml(brandName())}. We'll be in touch to set up your first coaching conversation.</p>
<p>Your name is never shown publicly. It's only shared with a business owner who signs an agreement with us.</p>`,
  });

  return { ok: true };
}
