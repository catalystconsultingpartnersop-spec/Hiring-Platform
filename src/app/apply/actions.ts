"use server";

import { bookCall } from "@/lib/calls";
import { db, logActivity } from "@/lib/db";
import { emailAdmin, escapeHtml, sendEmail } from "@/lib/email";
import { brandName, contactPhone, teamUrl } from "@/lib/format";
import { readSignedToken, signedToken, startCandidateSession } from "@/lib/session";
import { openSlots } from "@/lib/slots";
import { formatInZone } from "@/lib/time";
import { RESUME_CONTENT_TYPE, resumeKind } from "@/lib/resume";

const MAX_RESUME = 4 * 1024 * 1024;

export type ApplyState = {
  ok?: boolean;
  error?: string;
  token?: string | null; // lets them book a call without signing in
  first?: string;
  fields?: Record<string, string>;
};

// Step 1: the basics.
export async function submitApplication(_prev: ApplyState, form: FormData): Promise<ApplyState> {
  const get = (k: string) => String(form.get(k) ?? "").trim().slice(0, 4000);
  const full_name = get("full_name");
  const email = get("email").toLowerCase();
  const phone = get("phone");
  const looking_for = get("looking_for");
  const fields = { full_name, email, phone, looking_for };
  const fail = (error: string): ApplyState => ({ error, fields });

  if (form.get("website")) return { ok: true, token: null, first: "there" }; // spam trap
  if (full_name.length < 2) return fail("Add your name so we know what to call you.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("That email doesn't look quite right.");
  if (phone.replace(/\D/g, "").length < 7) return fail("Add a phone number in case we need to reach you.");
  if (!looking_for) return fail("Tell us a little about the work you're hoping for. A sentence is plenty.");
  if (form.get("consent") !== "on") return fail("Tick the box at the bottom so we can list you.");

  const resume = form.get("resume");
  const hasResume = resume instanceof File && resume.size > 0;
  if (hasResume) {
    if (resume.size > MAX_RESUME) return fail("That resume is over 4 MB. Try a smaller PDF, or skip it for now.");
    if (!resumeKind(resume)) return fail("Resumes need to be a PDF or Word file. You can also skip it for now.");
  }
  const resumeBuf = hasResume ? Buffer.from(await resume.arrayBuffer()) : null;
  const resumeExt = hasResume ? resumeKind(resume) : null;
  const first = full_name.split(" ")[0];

  let candidateId: string | null = null;
  try {
    const { data, error } = await db()
      .from("candidates")
      .insert({
        status: "applied",
        full_name,
        email,
        phone,
        application: { looking_for },
        consent_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    candidateId = data.id;
  } catch (e) {
    console.error("application could not be saved", e);
  }

  if (candidateId && resumeBuf) {
    try {
      const path = `${candidateId}/resume.${resumeExt}`;
      const { error } = await db().storage.from("resumes").upload(path, resumeBuf, { contentType: RESUME_CONTENT_TYPE[resumeExt!], upsert: true });
      if (error) throw error;
      await db().from("candidates").update({ resume_path: path }).eq("id", candidateId);
    } catch (e) {
      console.error("resume upload failed", e);
    }
  }
  if (candidateId) await logActivity(`candidate:${email}`, "applied", { candidate_id: candidateId });

  // Heshy always gets the application by email, so nothing is ever lost.
  const adminMail = await emailAdmin(
    `New candidate: ${full_name}${candidateId ? "" : " (not saved on the site; details below)"}`,
    `<p><strong>${escapeHtml(full_name)}</strong>, ${escapeHtml(email)}, ${escapeHtml(phone)}</p>
<p>Looking for: ${escapeHtml(looking_for)}</p>
${candidateId ? `<p><a href="${teamUrl()}/admin/candidates/${candidateId}">Open in admin</a></p>` : "<p><strong>This application couldn't be saved to the site, so this email is the only copy.</strong> The resume, if they sent one, is attached.</p>"}`,
    {
      replyTo: email,
      attachments: resumeBuf ? [{ filename: `${full_name.replace(/[^\w ]/g, "")} resume.${resumeExt}`, content: resumeBuf }] : undefined,
    },
  );
  if (!candidateId && !adminMail.ok) {
    return fail(`Something went wrong on our end. Please try again in a few minutes, or text or call us at ${contactPhone()}.`);
  }

  // They're signed in to their own page (/me) right away; no email round-trip.
  if (candidateId) await startCandidateSession(candidateId);
  return { ok: true, first, token: candidateId ? signedToken(`cand_${candidateId}`, 30) : null };
}

// Step 2: pick a time.
export async function availableTimes(): Promise<string[]> {
  return (await openSlots()).map((s) => s.start);
}

export type BookState = { ok?: boolean; error?: string; when?: string; manage?: string };

export async function bookTime(token: string, startIso: string, timeZone: string): Promise<BookState> {
  const candidateId = readSignedToken(token, "cand_");
  if (!candidateId) return { error: "This page has expired. Refresh it to start again, or text us and we'll book you in." };
  const r = await bookCall(candidateId, startIso, timeZone);
  if (!r.ok) return { error: r.error };
  return { ok: true, when: formatInZone(startIso, timeZone), manage: `/call/${r.manageToken}` };
}

// After booking: a couple of optional extras that help the call.
export async function saveExtras(token: string, _prev: { ok?: boolean }, form: FormData) {
  const candidateId = readSignedToken(token, "cand_");
  if (!candidateId) return { ok: false };
  const get = (k: string) => String(form.get(k) ?? "").trim().slice(0, 2000);
  const { data: cur } = await db().from("candidates").select("application").eq("id", candidateId).maybeSingle();
  const update: Record<string, unknown> = {
    application: { ...(cur?.application ?? {}), working_genius: get("working_genius"), never_show_to: get("never_show_to") },
  };
  if (get("working_genius")) update.working_genius = get("working_genius");
  if (get("never_show_to")) update.never_show_to = get("never_show_to");
  await db().from("candidates").update(update).eq("id", candidateId);
  return { ok: true };
}

// If no times are open (or they'd rather not pick), let us reach out instead.
export async function askUsToReachOut(token: string) {
  const candidateId = readSignedToken(token, "cand_");
  if (!candidateId) return { ok: false };
  const { data: c } = await db().from("candidates").select("full_name, email, phone").eq("id", candidateId).maybeSingle();
  if (c) {
    await emailAdmin(
      `Please schedule: ${c.full_name}`,
      `<p>${escapeHtml(c.full_name)} (${escapeHtml(c.email)}, ${escapeHtml(c.phone ?? "")}) applied and asked us to reach out to set up their onboarding call.</p>`,
    );
    await sendEmail({
      to: c.email,
      subject: `Thanks, ${c.full_name.split(" ")[0]}. We'll be in touch`,
      html: `<p>Thanks for reaching out to ${escapeHtml(brandName())}. Someone from our team will contact you within one business day to find a time to talk.</p><p>Questions before then? Text or call ${escapeHtml(contactPhone())}.</p>`,
    });
  }
  return { ok: true };
}
