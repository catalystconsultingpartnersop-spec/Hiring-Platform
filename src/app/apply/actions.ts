"use server";

import { isCheckAccount } from "@/lib/session";
import { cleanLanguages } from "@/lib/languages";
import { allow, SLOW_DOWN } from "@/lib/throttle";
import { referringRep } from "@/lib/shareKit";

import { bookCall } from "@/lib/calls";
import { candidate as candMail } from "@/lib/emails";
import { db, logActivity } from "@/lib/db";
import { emailAdmin, escapeHtml, sendEmail } from "@/lib/email";
import { teamUrl } from "@/lib/format";
import { readSignedToken, signedToken, startCandidateSession } from "@/lib/session";
import { openSlots } from "@/lib/slots";
import { formatInZone } from "@/lib/time";
import { RESUME_CONTENT_TYPE, resumeKind } from "@/lib/resume";
import { saveAssessmentFile } from "@/lib/assessmentFile";

const MAX_RESUME = 4 * 1024 * 1024;

export type ApplyState = {
  ok?: boolean;
  times?: string[]; // open times with their rep
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
  const fields = { full_name, email, phone, looking_for, rep: get("rep") };
  const fail = (error: string): ApplyState => ({ error, fields });

  if (form.get("website")) return { ok: true, token: null, first: "there" }; // spam trap
  if (full_name.length < 2) return fail("Add your name so we know what to call you.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("That email doesn't look quite right.");
  if (phone.replace(/\D/g, "").length < 7) return fail("Add a phone number in case we need to reach you.");
  if (!looking_for) return fail("Tell us a little about the work you're hoping for. A sentence is plenty.");
  if (form.get("consent") !== "on") return fail("Tick the box at the bottom to agree to your candidate agreement.");
  if (!(await allow("apply", 5, 60))) return fail(SLOW_DOWN);

  const resume = form.get("resume");
  const hasResume = resume instanceof File && resume.size > 0;
  const noResume = form.get("no_resume") === "on";
  if (!hasResume && !noResume) return fail("Please attach your resume, or tick that you don't have one yet.");
  if (hasResume) {
    if (resume.size > MAX_RESUME) return fail("That resume is over 4 MB. Try a smaller PDF.");
    if (!resumeKind(resume)) return fail("Resumes need to be a PDF or Word file.");
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
        application: hasResume ? { looking_for } : { looking_for, no_resume: "yes" },
        languages: cleanLanguages(form.getAll("languages")),
        consent_at: new Date().toISOString(),
        // They sign their candidate agreement right here, so nothing is left to do after their call.
        promise_signed_at: new Date().toISOString(),
        promise_name: full_name,
        added_by: await chosenRep(String(form.get("rep") ?? "")),
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
  if (candidateId) await logActivity(`candidate:${email}`, "applied", { candidate_id: candidateId, agreement_signed: true });

  // Heshy always gets the application by email, so nothing is ever lost.
  const adminMail = await emailAdmin(
    `New candidate: ${full_name}${candidateId ? "" : " (not saved on the site; details below)"}`,
    `<p><strong>${escapeHtml(full_name)}</strong>, ${escapeHtml(email)}, ${escapeHtml(phone)}</p>
<p>Looking for: ${escapeHtml(looking_for)}</p>
${hasResume ? "" : "<p><strong>No resume yet.</strong> They said they don't have one; the rep will build it with them on the call.</p>"}
${candidateId ? `<p><a href="${teamUrl()}/admin/candidates/${candidateId}">Open in admin</a></p>` : "<p><strong>This application couldn't be saved to the site, so this email is the only copy.</strong> The resume, if they sent one, is attached.</p>"}`,
    {
      replyTo: email,
      attachments: resumeBuf ? [{ filename: `${full_name.replace(/[^\w ]/g, "")} resume.${resumeExt}`, content: resumeBuf }] : undefined,
    },
  );
  if (!candidateId && !adminMail.ok) {
    return fail(`Something went wrong on our end. Please try again in a few minutes, or use the Contact us page.`);
  }

  // They're signed in to their own page (/me) right away; no email round-trip.
  if (candidateId) await startCandidateSession(candidateId);
  const token = candidateId ? signedToken(`cand_${candidateId}`, 30) : null;
  return { ok: true, first, token, times: token ? await availableTimes(token) : undefined };
}

// Who sent them: the rep they picked on the form, or the rep whose link they used.
async function chosenRep(picked: string): Promise<string | null> {
  if (/^[0-9a-f-]{36}$/i.test(picked)) {
    const { data } = await db().from("staff").select("id").eq("id", picked).eq("active", true).maybeSingle();
    if (data) return data.id;
  }
  return referringRep();
}

// The team members a candidate can say sent them.
export async function repChoices(): Promise<{ list: [string, string][]; referred: string | null }> {
  const { data } = await db().from("staff").select("id, full_name, email").eq("active", true);
  const list = ((data ?? []) as { id: string; full_name: string | null; email: string }[])
    .filter((s) => s.full_name && !isCheckAccount(s.email))
    .map((s): [string, string] => [s.id, s.full_name!])
    .sort((a, b) => a[1].localeCompare(b[1]));
  return { list, referred: await referringRep() };
}

// Step 2: pick a time.
// Their rep's times if they came through a rep's link (or a rep added them); otherwise everyone's.
export async function availableTimes(token?: string): Promise<string[]> {
  let rep: string | null = null;
  const candidateId = token ? readSignedToken(token, "cand_") : null;
  if (candidateId) {
    const { data } = await db().from("candidates").select("added_by").eq("id", candidateId).maybeSingle();
    rep = data?.added_by ?? null;
  } else rep = await referringRep();
  return (await openSlots(rep)).map((s) => s.start);
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
export async function saveExtras(token: string, _prev: { ok?: boolean; error?: string }, form: FormData): Promise<{ ok?: boolean; error?: string }> {
  const candidateId = readSignedToken(token, "cand_");
  if (!candidateId) return { ok: false, error: "This page has expired. Upload it from your page instead." };
  const file = form.get("assessment");
  if (file instanceof File && file.size > 0) {
    const problem = await saveAssessmentFile(candidateId, file);
    if (problem) return { error: problem };
    await logActivity("candidate", "assessment_uploaded", { candidate_id: candidateId });
  }
  const get = (k: string) => String(form.get(k) ?? "").trim().slice(0, 2000);
  const { data: cur } = await db().from("candidates").select("application").eq("id", candidateId).maybeSingle();
  const app: Record<string, string> = { ...(cur?.application ?? {}) };
  for (const k of ["working_genius", "never_show_to"]) if (form.has(k)) app[k] = get(k);
  const update: Record<string, unknown> = { application: app };
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
    const { data: who } = await db().from("candidates").select("added_by").eq("id", candidateId).maybeSingle();
    if (who?.added_by) {
      const { data: rep } = await db().from("staff").select("email, full_name, active").eq("id", who.added_by).maybeSingle();
      if (rep?.active)
        await sendEmail({
          to: rep.email,
          subject: `Please schedule: ${c.full_name}`,
          html: `<p>${escapeHtml(c.full_name)} (${escapeHtml(c.email)}, ${escapeHtml(c.phone ?? "")}) signed up through you and asked us to reach out to set up their call. None of your open times worked for them, or you have none open right now. Please reach out, or add a few times on My hours.</p>`,
          replyTo: c.email,
        });
    }
    await emailAdmin(
      `Please schedule: ${c.full_name}`,
      `<p>${escapeHtml(c.full_name)} (${escapeHtml(c.email)}, ${escapeHtml(c.phone ?? "")}) applied and asked us to reach out to set up their onboarding call.</p>`,
    );
    await sendEmail({ to: c.email, ...candMail.reachOutThanks({ name: c.full_name }) });
  }
  return { ok: true };
}
