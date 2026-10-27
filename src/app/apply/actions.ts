"use server";

import { db, logActivity } from "@/lib/db";
import { emailAdmin, escapeHtml, sendEmail } from "@/lib/email";
import { brandName, siteUrl } from "@/lib/format";

export type ApplyState = { ok?: boolean; error?: string };

const MAX_RESUME = 4 * 1024 * 1024;
const RESUME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

const FIELDS = [
  ["looking_for", "What kind of work you want"],
  ["experience", "Experience level"],
  ["location", "Where you live"],
  ["work_mode", "Work setting"],
  ["salary", "Salary you're looking for"],
  ["about", "About you"],
  ["working_genius", "Working Genius result"],
  ["never_show_to", "Never show me to"],
] as const;

export async function submitApplication(_prev: ApplyState, form: FormData): Promise<ApplyState> {
  const get = (k: string) => String(form.get(k) ?? "").trim().slice(0, 4000);
  const full_name = get("full_name");
  const email = get("email").toLowerCase();
  const phone = get("phone") || null;
  const linkedin = get("linkedin_url");

  if (form.get("website")) return { ok: true }; // spam trap
  if (full_name.length < 2) return { error: "Enter your full name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  if (!get("looking_for")) return { error: "Tell us what kind of work you want." };
  if (form.get("consent") !== "on") return { error: "Tick the box to agree to be listed." };
  if (linkedin && !/^https?:\/\//i.test(linkedin)) return { error: "The LinkedIn link should start with https://" };

  const resume = form.get("resume");
  const hasResume = resume instanceof File && resume.size > 0;
  if (hasResume) {
    if (resume.size > MAX_RESUME) return { error: "The resume file is over 4 MB. Try a smaller PDF." };
    if (!RESUME_TYPES[resume.type]) return { error: "Upload the resume as a PDF or Word file." };
  }

  const application: Record<string, string> = {};
  for (const [k] of FIELDS) application[k] = get(k);

  const { data, error } = await db()
    .from("candidates")
    .insert({
      status: "applied",
      full_name,
      email,
      phone,
      linkedin_url: linkedin || null,
      never_show_to: application.never_show_to || null,
      working_genius: application.working_genius || null,
      application,
      consent_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Something went wrong sending your application. Try again." };

  if (hasResume) {
    const path = `${data.id}/resume.${RESUME_TYPES[resume.type]}`;
    const { error: upErr } = await db()
      .storage.from("resumes")
      .upload(path, Buffer.from(await resume.arrayBuffer()), { contentType: resume.type, upsert: true });
    if (!upErr) await db().from("candidates").update({ resume_path: path }).eq("id", data.id);
    else console.error("resume upload failed", upErr);
  }

  await logActivity(`candidate:${email}`, "applied", { candidate_id: data.id });

  await sendEmail({
    to: email,
    subject: `We got your application, ${full_name.split(" ")[0]}`,
    html: `<p>Hi ${escapeHtml(full_name.split(" ")[0])},</p>
<p>Thanks for applying to ${escapeHtml(brandName())}. We'll be in touch to set up your first coaching conversation.</p>
<p>Nothing is listed until you've seen and approved your profile, and your name is never shown publicly.</p>`,
  });

  const rows = FIELDS.map(([k, label]) => `<tr><td style="padding:4px 12px 4px 0;color:#4a5570">${label}</td><td>${escapeHtml(application[k] || "—")}</td></tr>`).join("");
  await emailAdmin(
    `New candidate: ${full_name}`,
    `<p><strong>${escapeHtml(full_name)}</strong> (${escapeHtml(email)}${phone ? `, ${escapeHtml(phone)}` : ""}) applied.</p>
<table>${rows}</table>
<p><a href="${siteUrl()}/admin/candidates/${data.id}">Open in admin</a></p>`,
  );

  return { ok: true };
}
