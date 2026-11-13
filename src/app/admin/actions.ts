"use server";

import { clearEmailProblem } from "@/lib/emailProblems";
import { strengthsLink } from "@/lib/strengthsLink";
import { hiddenStaffIds } from "@/lib/hiddenStaff";
import { canEditCandidate } from "@/lib/reps";
import { cleanLanguages } from "@/lib/languages";
import { tidyHeadline, tidyHighlight, tidyParagraphs } from "@/lib/tidyText";
import { requestPromise } from "@/lib/promise";

import { clearCatalog } from "@/lib/catalog";

import { allow, SLOW_DOWN } from "@/lib/throttle";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, logActivity } from "@/lib/db";
import { emailAdmin, escapeHtml, sendEmail } from "@/lib/email";
import { candidateHired, hireSummaryHtml, repFor } from "@/lib/notify";
import { tellShortlisters } from "@/lib/shortlist";
import { commissionOf, commissionTerms, HireRow, StaffLite } from "@/lib/adminData";
import { brandName, candidateUrl, money, refCode, teamUrl, workEmailDomain } from "@/lib/format";

import {
  checkAdminPassword,
  checkPasswordHash,
  endAdminSession,
  hashPassword,
  hashToken,
  newLoginToken,
  isCheckAccount,
  isOwnerEmail,
  requireAdmin,
  type Staff,
  requireStaff,
  staffActor,
  startStaffSession,
  signedToken,
} from "@/lib/session";
import { stripe } from "@/lib/stripe";
import { callMinutesByRep } from "@/lib/slots";
import { cancelCall } from "@/lib/calls";
import { chargeCardOnFile } from "@/lib/cards";
import { commissionPercent, setSetting } from "@/lib/settings";
import { receiptNumber } from "@/lib/receipt";
import { candidate as candMail, owner as ownerMail, team as teamMail, teamExtra } from "@/lib/emails";
import { REP_AGREEMENT_VERSION, repAgreementText, repTerms } from "@/lib/repAgreement";
import { describe, suggestedHeadline } from "@/lib/strengths";
import { RESUME_CONTENT_TYPE, resumeKind } from "@/lib/resume";

export type FormState = { error?: string; ok?: string };

// ---------- Sign in ----------

// Team sign-in with email and password. Heshy's email with the ADMIN_PASSWORD
// from Vercel always works too, and counts as him.
export async function staffLogin(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  await new Promise((r) => setTimeout(r, 500)); // slows down password guessing
  if (!email || !password) return { error: "Enter your email and password." };
  if (!(await allow("staff_login", 30, 15))) return { error: SLOW_DOWN };

  // Too many wrong tries for this email in 15 minutes: pause.
  const since = new Date(Date.now() - 15 * 60e3).toISOString();
  const { count } = await db()
    .from("activity_log")
    .select("id", { count: "exact", head: true })
    .eq("action", "staff_login_failed")
    .eq("actor", `staff:${email}`)
    .gte("at", since);
  if ((count ?? 0) >= 8) return { error: "Too many tries. Wait 15 minutes, or use “Email me a link” below." };

  const ownerEmail = (process.env.ADMIN_EMAIL ?? "").toLowerCase();
  if (email === ownerEmail && checkAdminPassword(password)) {
    let { data: me } = await db().from("staff").select("id").eq("email", email).maybeSingle();
    if (!me) {
      const { data: created } = await db()
        .from("staff")
        .insert({ email, full_name: "Heshy", role: "admin" })
        .select("id")
        .single();
      me = created;
    }
    await startStaffSession(me?.id ?? "admin");
    if (me?.id) await db().from("staff").update({ last_login_at: new Date().toISOString() }).eq("id", me.id);
    await logActivity(`staff:${email}`, "staff_signed_in");
    redirect("/admin");
  }

  const { data: member } = await db()
    .from("staff")
    .select("id, active, password_hash")
    .eq("email", email)
    .maybeSingle();
  if (!member || !member.active || !checkPasswordHash(password, member.password_hash)) {
    await logActivity(`staff:${email}`, "staff_login_failed");
    return {
      error: member && member.active && !member.password_hash && email !== ownerEmail
        ? "You haven't set a password yet. Use “Email me a link” below, and you'll be asked to set one."
        : "That email and password don't match.",
    };
  }
  await startStaffSession(member.id);
  await db().from("staff").update({ last_login_at: new Date().toISOString() }).eq("id", member.id);
  await logActivity(`staff:${email}`, "staff_signed_in");
  redirect("/admin");
}

export async function setMyPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireStaff();
  if (!me.id) return { error: "Sign out and sign back in with your email first." };
  const pw = String(form.get("password") ?? "");
  const again = String(form.get("password2") ?? "");
  if (pw.length < 8) return { error: "Use at least 8 characters." };
  if (pw !== again) return { error: "The two passwords don't match." };
  const { error } = await db().from("staff").update({ password_hash: hashPassword(pw) }).eq("id", me.id);
  if (error) return { error: "Couldn't save your password. The database may need the latest update; tell Heshy." };
  await logActivity(staffActor(me), "password_set");
  redirect("/admin?password=set");
}

// Staff (Heshy and reps) sign in with an emailed link.
export async function requestStaffLink(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  const done: FormState = { ok: `If ${email} is on the team, a sign-in link is on its way. It works for 30 minutes.` };
  if (!(await allow("staff_link", 10, 60))) return { error: SLOW_DOWN };

  const isOwnerEmail = email === (process.env.ADMIN_EMAIL ?? "").toLowerCase();
  const { data: member } = await db().from("staff").select("id, active").eq("email", email).maybeSingle();
  if (!isOwnerEmail && (!member || !member.active)) {
    await logActivity("system", "staff_link_unknown_email", { email });
    return done; // don't reveal who is on the team
  }
  const since = new Date(Date.now() - 3600e3).toISOString();
  const { count } = await db()
    .from("login_tokens")
    .select("token_hash", { count: "exact", head: true })
    .eq("email", email)
    .eq("kind", "staff")
    .gte("created_at", since);
  if ((count ?? 0) >= 5) return { error: "Too many sign-in links requested. Wait an hour and try again." };

  const { token, hash } = newLoginToken();
  await db()
    .from("login_tokens")
    .insert({ token_hash: hash, email, kind: "staff", expires_at: new Date(Date.now() + 30 * 60e3).toISOString() });
  await sendEmail({
    to: email,
    subject: `Your ${brandName()} team sign-in link`,
    html: `<p>Click below to sign in to the ${escapeHtml(brandName())} back office. The link works once and expires in 30 minutes.</p>
<p><a href="${teamUrl()}/admin/verify?token=${token}" style="display:inline-block;background:#17213a;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Sign in</a></p>`,
  });
  return done;
}

export async function verifyStaffLink(form: FormData) {
  const token = String(form.get("token") ?? "");
  const now = new Date().toISOString();
  const { data } = await db()
    .from("login_tokens")
    .update({ used_at: now })
    .eq("token_hash", hashToken(token))
    .eq("kind", "staff")
    .is("used_at", null)
    .gt("expires_at", now)
    .select("email")
    .maybeSingle();
  if (!data) redirect("/admin/login?error=expired");

  let { data: member } = await db().from("staff").select("id, active").eq("email", data.email).maybeSingle();
  if (!member && data.email === (process.env.ADMIN_EMAIL ?? "").toLowerCase()) {
    // Heshy's own email becomes the first admin automatically.
    const { data: created } = await db()
      .from("staff")
      .insert({ email: data.email, full_name: "Heshy", role: "admin" })
      .select("id, active")
      .single();
    member = created;
  }
  if (!member || !member.active) redirect("/admin/login?error=inactive");
  await db().from("staff").update({ last_login_at: now }).eq("id", member.id);
  await startStaffSession(member.id);
  await logActivity(`staff:${data.email}`, "staff_signed_in");
  const { data: pw } = await db().from("staff").select("password_hash").eq("id", member.id).maybeSingle();
  redirect(pw?.password_hash ? "/admin" : "/admin/password?welcome=1");
}

export async function adminLogout() {
  await endAdminSession();
  redirect("/admin/login");
}

// ---------- Candidates ----------

const dollarsToCents = (v: string) => {
  const n = Number(v.replace(/[$,\s]/g, ""));
  return v.trim() && Number.isFinite(n) ? Math.round(n * 100) : null;
};
const toInt = (v: string) => {
  const n = Number(v.replace(/[$,\s]/g, ""));
  return v.trim() && Number.isFinite(n) ? Math.round(n) : null;
};
const listFrom = (v: string, sep: RegExp) =>
  v
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);


export async function saveCandidate(id: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireStaff();
  if (id && !(await canEditCandidate(me, id))) return { error: "This candidate belongs to another rep." };
  const actor = staffActor(me);
  const get = (k: string) => String(form.get(k) ?? "").trim();

  const status = get("status") || "draft";
  // Extra roles and industries: unique, not repeating the main one, at most 10.
  const many = (k: string, main: string) =>
    [...new Set(form.getAll(k).map((x) => String(x).trim().slice(0, 60)).filter((x) => x && x.toLowerCase() !== main.toLowerCase()))].slice(0, 10);
  const record: Record<string, unknown> = {
    also_roles: many("also_roles", get("role_category")),
    also_industries: many("also_industries", get("industry")),
    status,
    headline: tidyHeadline(get("headline")) || null,
    role_category: get("role_category") || null,
    industry: get("industry") || null,
    level: get("level") || null,
    location_region: get("location_region") || null,
    work_mode: get("work_mode") || null,
    languages: cleanLanguages(form.getAll("languages")),
    salary_min: toInt(get("salary_min")),
    salary_max: toInt(get("salary_max")),
    strengths: listFrom(get("strengths"), /[,\n]/),
    working_genius: get("working_genius") || null,
    summary: tidyParagraphs(get("summary")) || null,
    highlights: listFrom(get("highlights"), /\n/).map(tidyHighlight).filter(Boolean),
    ...(me.role === "admin" ? { fee_override_cents: dollarsToCents(get("fee_override")) } : {}),
    full_name: get("full_name"),
    email: get("email").toLowerCase(),
    phone: get("phone") || null,
    linkedin_url: get("linkedin_url") || null,
    full_profile: get("full_profile") || null,
    never_show_to: get("never_show_to") || null,
    admin_notes: get("admin_notes") || null,
    updated_at: new Date().toISOString(),
  };

  if (!record.full_name || !record.email) return { error: "Their name and email are required. Nothing was saved." };
  if (!record.headline && record.role_category) {
    record.headline = suggestedHeadline(record.role_category as string, record.working_genius as string | null);
  }
  if (status === "listed") {
    const missing = [
      !record.role_category && "the role they want",
      !describe(record.working_genius as string | null) && "their Strengths Assessment result (at least the top two)",
    ].filter(Boolean);
    if (missing.length) return { error: `To list this candidate, fill in: ${missing.join(", ")}. Nothing was saved.` };
  }

  let candidateId = id;
  let merged = false;
  let wasListed = false;
  let detailsChanged = false;
  if (id) {
    const { data: before } = await db().from("candidates").select("status, listed_at, summary, highlights, working_genius, role_category, also_roles, level, industry").eq("id", id).single();
    detailsChanged =
      before?.summary !== record.summary ||
      JSON.stringify(before?.highlights ?? []) !== JSON.stringify(record.highlights) ||
      before?.working_genius !== record.working_genius ||
      before?.role_category !== record.role_category ||
      JSON.stringify(before?.also_roles ?? []) !== JSON.stringify(record.also_roles) ||
      before?.level !== record.level ||
      before?.industry !== record.industry;
    wasListed = before?.status === "listed";
    if (status === "listed" && !before?.listed_at) record.listed_at = new Date().toISOString();
    const { error } = await db().from("candidates").update(record).eq("id", id);
    if (error) return { error: `Could not save: ${error.message}` };
    if (before?.status !== status) await logActivity(actor, "candidate_status", { candidate: refCode(id), from: before?.status, to: status });
    if (before?.status !== "hired" && status === "hired") {
      // Hired outside the site's payment flow: still tell everyone.
      const notice = await candidateHired(id, null, null, {});
      const { data: c } = await db().from("candidates").select("full_name").eq("id", id).single();
      await emailAdmin(
        `Marked hired: ${c?.full_name} (${refCode(id)})`,
        `<p>${escapeHtml(me.name)} marked <strong>${escapeHtml(c?.full_name ?? "")}</strong> (${refCode(id)}) as hired from the back office. No payment went through the site for this hire.</p>
<p><a href="${teamUrl()}/admin/candidates/${id}">Open their profile</a></p>
${hireSummaryHtml(notice)}`,
      );
    }
    if (before?.status === "listed" && status === "archived") await tellShortlisters(id, "removed");
    if (before?.status === "hired" && status === "listed") {
      await logActivity(actor, "candidate_relisted_after_hire", { candidate: refCode(id) });
    }
  } else {
    // Already in the system (they applied or booked a call themselves)? Save to
    // that profile instead of making a second one, so nothing gets split up.
    const { data: existing } = await db()
      .from("candidates")
      .select("id, status, listed_at")
      .ilike("email", String(record.email).replace(/[%_\\]/g, "\\$&"))
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existing) {
      const filled = Object.fromEntries(
        Object.entries(record).filter(([, v]) => (Array.isArray(v) ? v.length > 0 : v !== null && v !== "")),
      );
      if (existing.status === "hired") delete filled.status;
      if (filled.status === "listed" && !existing.listed_at) filled.listed_at = new Date().toISOString();
      const { error } = await db().from("candidates").update(filled).eq("id", existing.id);
      if (error) return { error: `Could not save: ${error.message}` };
      candidateId = existing.id;
      merged = true;
      await logActivity(actor, "candidate_merged_into_existing", { candidate: refCode(existing.id) });
    }
  }
  if (!id && !merged) {
    if (status === "listed") record.listed_at = new Date().toISOString();
    record.consent_at = form.get("consent") === "on" ? new Date().toISOString() : null;
    if (me.id) record.added_by = me.id;
    const { data, error } = await db().from("candidates").insert(record).select("id").single();
    if (error || !data) return { error: `Could not save: ${error?.message}` };
    candidateId = data.id;
    await logActivity(actor, "candidate_created", { candidate: refCode(data.id) });
  }

  // Candidates who applied on the site signed their agreement when they applied.
  // Anyone else goes live right away, and we email them their agreement to sign
  // (it never holds the profile back).
  let agreementSent = false;
  if (status === "listed" && candidateId && !wasListed) {
    const { data: row } = await db().from("candidates").select("*").eq("id", candidateId).single();
    if (row && "promise_signed_at" in row && !row.promise_signed_at && !row.promise_requested_at) {
      await requestPromise(candidateId, false);
      agreementSent = true;
    }
  }
  const awaitingPromise = false;

  const resume = form.get("resume");
  let resumeProblem = "";
  if (resume instanceof File && resume.size > 0) {
    const kind = resumeKind(resume);
    if (!kind) resumeProblem = "the resume needs to be a PDF, Word file or photo";
    else if (resume.size > 4 * 1024 * 1024) resumeProblem = "the resume is over 4 MB";
    else {
      const path = `${candidateId}/resume.${kind}`;
      await keepOriginalResume(candidateId!);
      const { error } = await db()
        .storage.from("resumes")
        .upload(path, Buffer.from(await resume.arrayBuffer()), { contentType: RESUME_CONTENT_TYPE[kind], upsert: true });
      if (error) {
        resumeProblem = `the resume didn't upload (${error.message})`;
        await logActivity(actor, "resume_upload_failed", { candidate: refCode(candidateId!), error: error.message });
      } else {
        await db().from("candidates").update({ resume_path: path }).eq("id", candidateId);
      }
    }
  }

  // Their page for owners: what the rep wrote or kept. Listed without one? Write it.
  // The rep's take on who they are and what they want: the AI writes their profile around it.
  if (candidateId && form.has("rep_take")) {
    const take = String(form.get("rep_take") ?? "").trim().slice(0, 2000);
    const { data: cur } = await db().from("candidates").select("application").eq("id", candidateId).maybeSingle();
    const app = { ...((cur?.application ?? {}) as Record<string, string>) };
    if ((app.rep_take ?? "") !== take) {
      // A new take reshapes the owner page too (unless a rep wrote that page by hand).
      detailsChanged = true;
      if (take) app.rep_take = take;
      else delete app.rep_take;
      await db().from("candidates").update({ application: app }).eq("id", candidateId);
    }
  }

  // The rep's own wording for the strengths badge and the "Best at..." line (blank = automatic).
  if (candidateId && form.has("type_label")) {
    const { data: cur } = await db().from("candidates").select("application").eq("id", candidateId).maybeSingle();
    const app = { ...((cur?.application ?? {}) as Record<string, string>) };
    let changed = false;
    for (const [k, max] of [["type_label", 40], ["best_line", 160], ["rep_word", 160]] as const) {
      const val = String(form.get(k) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
      if ((app[k] ?? "") === val) continue;
      if (val) app[k] = val;
      else delete app[k];
      changed = true;
    }
    if (changed) await db().from("candidates").update({ application: app }).eq("id", candidateId);
  }

  // Full-time or part-time, kept in the application too.
  if (candidateId && form.has("hours")) {
    const { cleanHours } = await import("@/lib/hours");
    const h = cleanHours(form.get("hours"));
    const { data: cur } = await db().from("candidates").select("application").eq("id", candidateId).maybeSingle();
    const app = { ...((cur?.application ?? {}) as Record<string, string>) };
    if ((app.hours ?? "") !== h) {
      if (h) app.hours = h;
      else delete app.hours;
      await db().from("candidates").update({ application: app }).eq("id", candidateId);
    }
  }

  // When they can start: kept in their application, so it rides along without a new column.
  if (candidateId && form.has("available")) {
    const { cleanAvailability } = await import("@/lib/availability");
    const avail = cleanAvailability(form.get("available"));
    const { data: cur } = await db().from("candidates").select("application").eq("id", candidateId).maybeSingle();
    const app = { ...((cur?.application ?? {}) as Record<string, string>) };
    if ((app.available ?? "") !== avail) {
      if (avail) app.available = avail;
      else delete app.available;
      await db().from("candidates").update({ application: app }).eq("id", candidateId);
    }
  }

  // Only when the rep actually changed it here (compared with what the form showed them).
  const ownerFields = ["owner_intro", "owner_handle", "owner_fit", "owner_years"].map((k) => get(k).replace(/\s+/g, " ")).join("|");
  if (candidateId && form.has("owner_intro") && ownerFields !== String(form.get("owner_was") ?? "")) {
    const { handleFromText, saveOwnerPage } = await import("@/lib/ownerPage");
    const page = {
      intro: tidyParagraphs(get("owner_intro")),
      handle: handleFromText(get("owner_handle")).map((h) => ({ ...h, title: tidyHighlight(h.title), detail: h.detail ? tidyParagraphs(h.detail) : "" })),
      fit: listFrom(get("owner_fit"), /\n/).map(tidyHighlight).slice(0, 4),
      years: get("owner_years").slice(0, 30),
    };
    await saveOwnerPage(candidateId, page.intro || page.handle.length || page.fit.length ? page : null, actor);
  }
  if (candidateId && status === "listed") {
    const cid = candidateId;
    const refresh = detailsChanged || (resume instanceof File && resume.size > 0);
    after(async () => {
      const { fillOwnerPage } = await import("@/lib/ownerPage");
      await fillOwnerPage(cid, actor, { refresh }).catch((e) => console.error("owner page", e));
      clearCatalog();
    });
  }

  revalidatePath("/admin");
  revalidatePath("/candidates");
  clearCatalog();
  // A new candidate always goes to their page, so saving again never makes a duplicate.
  // Their Working Genius report (team only, never shown to clients).
  const report = form.get("assessment");
  if (report instanceof File && report.size > 0) {
    const n = report.name.toLowerCase();
    const ext = report.type === "application/pdf" || n.endsWith(".pdf") ? "pdf" : /\.(png|jpe?g)$/.test(n) || report.type.startsWith("image/") ? (n.endsWith(".png") || report.type === "image/png" ? "png" : "jpg") : null;
    if (!ext) resumeProblem = "the assessment report needs to be a PDF or a photo";
    else if (report.size > 6 * 1024 * 1024) resumeProblem = "the assessment report is over 6 MB";
    else {
      const path = `${candidateId}/assessment.${ext}`;
      const type = ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : "image/jpeg";
      const { error } = await db().storage.from("resumes").upload(path, Buffer.from(await report.arrayBuffer()), { contentType: type, upsert: true });
      if (error) resumeProblem = `the assessment report didn't upload (${error.message})`;
      else await db().from("candidates").update({ assessment_path: path }).eq("id", candidateId);
    }
  }
  if (!id) redirect(`/admin/candidates/${candidateId}?saved=${awaitingPromise ? "promise" : status}${merged ? "&merged=1" : ""}${resumeProblem ? `&resume=${encodeURIComponent(resumeProblem)}` : ""}`);
  if (resumeProblem) return { error: `Saved, but ${resumeProblem}. Try attaching it again.` };
  return {
    ok: awaitingPromise
      ? ""
      : status === "listed"
        ? agreementSent
          ? "Saved. They're live in the catalog, and we've emailed them their candidate agreement to sign."
          : "Saved. They're live in the catalog."
        : `Saved as ${status}. Owners won't see them until the status is Listed.`,
  };
}

// ---------- Fees ----------

export async function saveTiers(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  clearCatalog();
  const ids = form.getAll("tier_id").map(String);
  for (let i = 0; i < ids.length; i++) {
    const maxRaw = String(form.getAll("max_salary")[i] ?? "");
    const feeRaw = String(form.getAll("fee")[i] ?? "");
    const isLast = i === ids.length - 1;
    const { error } = await db()
      .from("fee_tiers")
      .update({ max_salary: isLast ? null : toInt(maxRaw), fee_cents: dollarsToCents(feeRaw), sort: i + 1 })
      .eq("id", ids[i]);
    if (error) return { error: `Could not save: ${error.message}` };
  }
  await logActivity("admin", "fee_tiers_saved");
  revalidatePath("/admin/settings");
  return { ok: "Fees saved. New agreements use these amounts; signed ones keep theirs." };
}

export async function addTier() {
  await requireAdmin();
  clearCatalog();
  const { data } = await db().from("fee_tiers").select("sort").order("sort", { ascending: false }).limit(1);
  await db().from("fee_tiers").insert({ max_salary: null, fee_cents: null, sort: (data?.[0]?.sort ?? 0) + 1 });
  revalidatePath("/admin/settings");
}

export async function removeTier(id: string) {
  await requireAdmin();
  clearCatalog();
  const { count } = await db().from("fee_tiers").select("id", { count: "exact", head: true });
  if ((count ?? 0) <= 1) return;
  await db().from("fee_tiers").delete().eq("id", id);
  revalidatePath("/admin/settings");
}

// ---------- Unlocks & hires ----------

export async function setUnlockFee(unlockId: string, form: FormData) {
  await requireAdmin();
  const cents = dollarsToCents(String(form.get("fee") ?? ""));
  if (cents == null || cents <= 0) return;
  await db().from("unlocks").update({ fee_cents: cents }).eq("id", unlockId);
  await logActivity("admin", "unlock_fee_set", { unlock_id: unlockId, fee_cents: cents });
  revalidatePath("/admin");
}

// Charges the fee to the owner's card on file (e.g. they hired without
// pressing the button, or the fee was set by hand).
export async function chargeAgreement(unlockId: string) {
  const me = await requireAdmin();
  const r = await chargeCardOnFile(unlockId, staffActor(me));
  revalidatePath("/admin");
  redirect(r.ok ? "/admin/agreements?charged=1" : `/admin/agreements?charge_error=${encodeURIComponent(r.error)}`);
}

export async function markHired(hireId: string) {
  await requireAdmin();
  const { data: hire } = await db().from("hires").select("id, status, unlock_id, unlocks(candidate_id)").eq("id", hireId).single();
  if (!hire || hire.status !== "paid") return;
  await db().from("hires").update({ status: "hired", hired_at: new Date().toISOString() }).eq("id", hireId);
  const candidateId = (hire as unknown as { unlocks: { candidate_id: string } }).unlocks.candidate_id;
  await db().from("candidates").update({ status: "hired", updated_at: new Date().toISOString() }).eq("id", candidateId);
  await logActivity("admin", "hire_confirmed", { hire_id: hireId, candidate: refCode(candidateId) });
  revalidatePath("/admin");
}

// Full refund to the client's card. Works whether or not the hire has started.
export async function refundHire(hireId: string, form?: FormData) {
  const me = await requireAdmin();
  clearCatalog();
  const back = String(form?.get("back") ?? "/admin/payments");
  const reason = String(form?.get("reason") ?? "").trim().slice(0, 300);
  const go = (q: string) => redirect(`${back.startsWith("/admin") ? back : "/admin/payments"}${back.includes("?") ? "&" : "?"}${q}`);

  const { data: hire } = await db()
    .from("hires")
    .select("id, status, amount_cents, stripe_payment_intent, unlocks(candidate_id, owners(email, full_name, company))")
    .eq("id", hireId)
    .single();
  if (!hire || !["paid", "hired"].includes(hire.status)) go("refund_error=This+payment+can%27t+be+refunded+(already+refunded%3F)");
  if (!hire!.stripe_payment_intent) go("refund_error=No+card+payment+found+for+this+hire");

  try {
    await stripe().refunds.create({ payment_intent: hire!.stripe_payment_intent!, reason: "requested_by_customer" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logActivity(staffActor(me), "refund_failed", { hire_id: hireId, error: msg });
    go(`refund_error=${encodeURIComponent(msg)}`);
  }
  await db().from("hires").update({ status: "refunded", refunded_at: new Date().toISOString() }).eq("id", hireId);
  // Off "hired", but not straight back on the catalog: Heshy or the rep relists them.
  const u = (hire as unknown as { unlocks: { candidate_id: string; owners: { email: string; full_name: string | null; company: string | null } } }).unlocks;
  await db().from("candidates").update({ status: "paused", updated_at: new Date().toISOString() }).eq("id", u.candidate_id).eq("status", "hired");

  await logActivity(staffActor(me), "hire_refunded", { hire_id: hireId, candidate: refCode(u.candidate_id), amount_cents: hire!.amount_cents, reason });
  await sendEmail({
    to: u.owners.email,
    ...ownerMail.refund({ name: u.owners.full_name, amount: hire!.amount_cents, candidate: `candidate ${refCode(u.candidate_id)}`, receipt: receiptNumber(hireId) }),
  });
  revalidatePath("/admin");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/clients");
  go(`refunded=${encodeURIComponent(money(hire!.amount_cents))}`);
}

// ---------- Team ----------

// Commission terms from a form: default, a percent, or a flat amount per hire.
function termsFrom(form: FormData): { commission_type: "percent" | "flat" | null; commission_value: number | null; commission_note: string | null } | string {
  const type = String(form.get("commission_type") ?? "default");
  const raw = String(form.get("commission_value") ?? "").replace(/[$,%\s]/g, "");
  const note = String(form.get("commission_note") ?? "").trim().slice(0, 300) || null;
  if (type === "default") return { commission_type: null, commission_value: null, commission_note: note };
  const v = Number(raw);
  if (!raw || !Number.isFinite(v) || v <= 0) return type === "flat" ? "Enter the flat amount per hire, e.g. 750." : "Enter the percent, e.g. 15.";
  if (type === "percent" && v > 100) return "A percent can't be more than 100.";
  return { commission_type: type === "flat" ? "flat" : "percent", commission_value: v, commission_note: note };
}

// Emails a rep (or admin) their onboarding package: their terms, how to start,
// and a fresh link to set their password.
async function sendPackage(staffId: string) {
  const { data: m } = await db().from("staff").select("*").eq("id", staffId).single();
  if (!m) return { ok: false, error: "Not found." };
  const { token, hash } = newLoginToken();
  await db()
    .from("login_tokens")
    .insert({ token_hash: hash, email: m.email, kind: "staff", expires_at: new Date(Date.now() + 7 * 864e5).toISOString() });
  const r = await sendEmail({
    to: m.email,
    ...teamMail.onboardingPackage({
      name: m.full_name ?? m.email,
      terms: commissionTerms(m, await commissionPercent()),
      note: m.commission_note ?? null,
      setPasswordLink: `${teamUrl()}/admin/verify?token=${token}`,
      isAdmin: m.role === "admin",
      // Not on a work email yet? Tell them which one is coming.
      workEmail: m.email.endsWith(`@${workEmailDomain()}`) ? null : suggestedWorkEmail(m.full_name ?? m.email),
    }),
  });
  if (r.ok) await db().from("staff").update({ package_sent_at: new Date().toISOString() }).eq("id", staffId);
  return r;
}

// A sign-in link to hand someone directly (WhatsApp, text) when email isn't reaching them.
// Same as the link in their package: good for 7 days, used once, then they choose a password.
export async function signInLinkFor(staffId: string): Promise<{ link?: string; error?: string }> {
  const me = await requireAdmin();
  const { data: m } = await db().from("staff").select("id, email, active").eq("id", staffId).maybeSingle();
  if (!m || !m.active) return { error: "They're switched off." };
  const { token, hash } = newLoginToken();
  const { error } = await db()
    .from("login_tokens")
    .insert({ token_hash: hash, email: m.email, kind: "staff", expires_at: new Date(Date.now() + 7 * 864e5).toISOString() });
  if (error) return { error: "Couldn't make a link. Try again." };
  await logActivity(staffActor(me), "signin_link_copied", { staff: staffId });
  return { link: `${teamUrl()}/admin/verify?token=${token}` };
}

function suggestedWorkEmail(name: string) {
  const first = name.split(/[\s@]/)[0].toLowerCase().replace(/[^a-z]/g, "");
  return `${first || "you"}@${workEmailDomain()}`;
}

// Move a teammate from their personal email to their work email. Same
// password; sign-in, invites and updates use the work email from now on.
export async function switchToWorkEmail(staffId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const email = String(form.get("work_email") ?? "").trim().toLowerCase();
  const domain = workEmailDomain();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter an email address." };
  const { data: m } = await db().from("staff").select("*").eq("id", staffId).single();
  if (!m) return { error: "Not found." };
  // Moving them off the work email (back to a personal one): change it quietly.
  const back = String(m.email).endsWith(`@${domain}`) && !email.endsWith(`@${domain}`);
  if (!back && !email.endsWith(`@${domain}`)) return { error: `Enter their @${domain} address.` };
  if (m.email === email) return { ok: "They're already on that email." };
  const { data: taken } = await db().from("staff").select("id").eq("email", email).maybeSingle();
  if (taken) return { error: "Someone on the team already uses that email." };
  const { error } = await db().from("staff").update({ email }).eq("id", staffId);
  if (error) return { error: `Could not switch: ${error.message}` };
  await logActivity(staffActor(me), back ? "work_email_undone" : "work_email_set", { staff: staffId, from: m.email, to: email });
  if (back) {
    revalidatePath(`/admin/team/${staffId}`);
    revalidatePath("/admin/team");
    return { ok: `Switched back. ${m.full_name?.split(" ")[0] ?? "They"} signs in with ${email} again, same password.` };
  }
  const mail = teamExtra.workEmailReady({ name: m.full_name ?? email, workEmail: email });
  await sendEmail({ to: email, ...mail });
  await sendEmail({ to: m.email, ...mail });
  revalidatePath(`/admin/team/${staffId}`);
  revalidatePath("/admin/team");
  return { ok: `Switched. ${m.full_name?.split(" ")[0] ?? "They"} now signs in with ${email}, and was told at both addresses.` };
}

export async function addStaff(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const full_name = String(form.get("full_name") ?? "").trim();
  const role = form.get("role") === "admin" ? "admin" : "rep";
  if (!full_name) return { error: "Enter their name." };
  if (isOwnerEmail(email)) return { error: "That's the owner's email. It's already on the team." };
  if (role === "admin" && !me.owner) return { error: "Only Heshy can add admins." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  const terms = termsFrom(form);
  if (typeof terms === "string") return { error: terms };
  const { data, error } = await db()
    .from("staff")
    .upsert({ email, full_name, role, active: true, ...terms }, { onConflict: "email" })
    .select("id")
    .single();
  if (error || !data) return { error: `Could not add them: ${error?.message}` };
  {
    const { cleanPhone, setStaffPhone } = await import("@/lib/staffPhones");
    const ph = cleanPhone(String(form.get("phone") ?? ""));
    if (ph) await setStaffPhone(data.id as string, ph);
  }
  await logActivity(staffActor(me), "staff_added", { email, role });
  revalidatePath("/admin/team");
  if (form.get("send_package") === "on") {
    const r = await sendPackage(data.id);
    return r.ok ? { ok: `${full_name} was added and emailed their onboarding package.` } : { error: `Added, but the email didn't send: ${r.error}` };
  }
  return { ok: `${full_name} was added. Send their onboarding package from their page when you're ready.` };
}

export async function saveRepTerms(staffId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const terms = termsFrom(form);
  if (typeof terms === "string") return { error: terms };
  await db().from("staff").update(terms).eq("id", staffId);
  await logActivity(staffActor(me), "rep_terms_set", { staff: staffId, ...terms });
  revalidatePath(`/admin/team/${staffId}`);
  return { ok: "Saved. These terms apply to their future hires and to their agreement if they haven't signed yet." };
}

export async function sendOnboardingPackage(staffId: string): Promise<FormState> {
  const me = await requireAdmin();
  const r = await sendPackage(staffId);
  await logActivity(staffActor(me), "onboarding_package_sent", { staff: staffId, ok: r.ok });
  revalidatePath(`/admin/team/${staffId}`);
  return r.ok ? { ok: "Sent. They have a fresh link that works for 7 days." } : { error: `It didn't send: ${r.error}` };
}

// Who an admin is allowed to change: never the owner, and only the owner
// can change other admins.
async function canManage(me: Staff, id: string, makingAdmin = false) {
  if (me.id === id) return false; // can't lock yourself out
  const { data } = await db().from("staff").select("email, role").eq("id", id).maybeSingle();
  if (!data || isOwnerEmail(data.email)) return false;
  if ((data.role === "admin" || makingAdmin) && !me.owner) return false;
  return true;
}

export async function setStaffActive(id: string, active: boolean) {
  const me = await requireAdmin();
  if (!(await canManage(me, id))) return;
  await db().from("staff").update({ active }).eq("id", id);
  await logActivity(staffActor(me), active ? "staff_reactivated" : "staff_removed", { staff_id: id });
  // Removed: everything of theirs moves to Shloimy. They are never emailed.
  if (!active) await (await import("@/lib/removeRep")).handOver(id, staffActor(me)).catch((err) => console.error("hand over", err));
  revalidatePath("/admin/candidates");
  revalidatePath("/admin/team");
}

export async function setStaffRole(id: string, role: "admin" | "rep") {
  const me = await requireAdmin();
  if (!(await canManage(me, id, role === "admin"))) return;
  await db().from("staff").update({ role }).eq("id", id);
  await logActivity(staffActor(me), "staff_role_changed", { staff_id: id, role });
  revalidatePath("/admin/team");
}

// ---------- Email check ----------

export async function sendTestEmail(): Promise<FormState> {
  const me = await requireAdmin();
  const to = me.email || process.env.ADMIN_EMAIL || "";
  if (!to) return { error: "ADMIN_EMAIL is missing in Vercel, so there's nowhere to send the test." };
  const r = await sendEmail({
    to,
    subject: `Test email from ${brandName()}`,
    html: "<p>If you're reading this, the site can send email.</p>",
  });
  return r.ok ? { ok: `Sent to ${to}. Check your inbox.` } : { error: `The email service said: ${r.error}` };
}

// ---------- My hours (each rep's weekly availability) ----------

export async function saveMyHours(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireStaff();
  if (!me.id) return { error: "Sign in with your email link (not the admin password) to set your own hours." };

  const len = form.get("call_minutes") === "30" ? 30 : 45;
  const rows: { staff_id: string; weekday: number; start_minute: number; end_minute: number }[] = [];
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  for (let d = 0; d < 7; d++) {
    if (form.get(`on_${d}`) !== "on") continue;
    const count = Math.min(8, Number(form.get(`n_${d}`)) || 0);
    const mine: [number, number][] = [];
    for (let i = 0; i < count; i++) {
      const start = Number(form.get(`start_${d}_${i}`));
      const end = Number(form.get(`end_${d}_${i}`));
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      if (!(end > start)) return { error: `${dayNames[d]}: each end time needs to be after its start time.` };
      if (end - start < 30) return { error: `${dayNames[d]}: each time block needs at least 30 minutes.` };
      mine.push([start, end]);
    }
    mine.sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < mine.length; i++)
      if (mine[i][0] < mine[i - 1][1]) return { error: `${dayNames[d]}: two of your time blocks overlap.` };
    for (const [start, end] of mine) rows.push({ staff_id: me.id, weekday: d, start_minute: start, end_minute: end });
  }

  const link = String(form.get("meeting_link") ?? "").trim();
  if (link && !/^https:\/\/\S+$/i.test(link)) return { error: "The video link should start with https://" };
  const tz = String(form.get("time_zone") ?? "America/New_York");

  const { error: e1 } = await db().from("staff").update({ meeting_link: link || null, time_zone: tz }).eq("id", me.id);
  if (e1) return { error: `Could not save: ${e1.message}` };
  const { error: e2 } = await db().from("staff_availability").delete().eq("staff_id", me.id);
  if (e2) return { error: `Could not save: ${e2.message}` };
  if (rows.length) {
    const { error: e3 } = await db().from("staff_availability").insert(rows);
    if (e3) return { error: `Could not save: ${e3.message}` };
  }
  const lengths = await callMinutesByRep();
  await setSetting("call_minutes", { ...lengths, [me.id]: len });
  const days = new Set(rows.map((r) => r.weekday)).size;
  await logActivity(staffActor(me), "hours_saved", { days, blocks: rows.length, call_minutes: len });
  revalidatePath("/admin/hours");
  return {
    ok: rows.length
      ? `Saved. Candidates can now book calls with you on ${days} ${days === 1 ? "day" : "days"} a week.`
      : "Saved. You have no hours set, so candidates can't book you right now.",
  };
}

// ---------- Onboarding calls ----------

async function myCallOrNull(callId: string) {
  const me = await requireStaff();
  const { data } = await db().from("onboarding_calls").select("id, staff_id, status").eq("id", callId).maybeSingle();
  if (!data) return null;
  if (!me.manager && data.staff_id !== me.id) return null; // reps only touch their own calls
  return { me, call: data };
}

export async function markCall(callId: string, status: "done" | "no_show") {
  const found = await myCallOrNull(callId);
  if (!found) return;
  const wasBooked = (found.call as { status?: string }).status === "booked";
  await db().from("onboarding_calls").update({ status, updated_at: new Date().toISOString() }).eq("id", callId);
  await logActivity(staffActor(found.me), `onboarding_call_${status}`, { call_id: callId });
  // Didn't show: send them a kind note with a link to pick a new time (once).
  if (status === "no_show" && wasBooked) {
    const { sendMissedCallEmail } = await import("@/lib/calls");
    await sendMissedCallEmail(callId).catch((e) => console.error("missed call email", e));
  }
  // Marked done: if Google already has the transcript, draft their profile right away.
  if (status === "done") {
    const { data: k } = await db().from("onboarding_calls").select("*").eq("id", callId).maybeSingle();
    if (k?.meet_space) {
      const { draftFromCall } = await import("@/lib/callDraft");
      await draftFromCall(k.candidate_id).catch(() => null);
    }
  }
  revalidatePath("/admin/calls");
}

export async function cancelCallByStaff(callId: string) {
  const found = await myCallOrNull(callId);
  if (!found) return;
  await cancelCall(callId, staffActor(found.me));
  revalidatePath("/admin/calls");
}

// ---------- Commissions ----------

function refreshMoney() {
  revalidatePath("/admin");
  revalidatePath("/admin/payments");
}

export async function setCommissionPercent(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const pct = Number(String(form.get("percent") ?? "").replace("%", "").trim());
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return { error: "Enter a number from 0 to 100." };
  const value = Math.round(pct * 100) / 100;
  const { error } = await setSetting("commission_percent", value);
  if (error) return { error: "Couldn't save. Try again." };
  await logActivity(staffActor(me), "commission_rate_set", { percent: value });
  refreshMoney();
  return { ok: `Saved. Reps without their own terms now earn ${value}% of each fee. Commissions already paid out don't change.` };
}

export async function setCommissionAmount(hireId: string, form: FormData) {
  const me = await requireAdmin();
  const raw = String(form.get("amount") ?? "").trim();
  const cents = raw === "" ? null : dollarsToCents(raw);
  if (raw !== "" && (cents == null || cents < 0)) return;
  await db().from("hires").update({ commission_cents: cents }).eq("id", hireId);
  await logActivity(staffActor(me), "commission_amount_set", { hire_id: hireId, cents });
  refreshMoney();
}

// The commission for one hire, using the rep's own terms (or the default rate).
async function commissionDue(hireId: string) {
  const { data: h } = await db().from("hires").select("*, unlocks(candidates(added_by))").eq("id", hireId).single();
  if (!h) return null;
  const repId = h.rep_id ?? (h as unknown as { unlocks: { candidates: { added_by: string | null } } }).unlocks?.candidates?.added_by;
  const [{ data: rep }, pct] = await Promise.all([
    repId ? db().from("staff").select("*").eq("id", repId).maybeSingle() : Promise.resolve({ data: null }),
    commissionPercent(),
  ]);
  return commissionOf(h as HireRow, pct, (rep ?? undefined) as StaffLite | undefined);
}

export async function markCommissionPaid(hireId: string, form: FormData) {
  const me = await requireAdmin();
  const note = String(form.get("note") ?? "").trim().slice(0, 200) || null;
  // Freeze the amount that was paid, so changing a rate later doesn't change history.
  const amount = await commissionDue(hireId);
  if (amount == null) return;
  await db()
    .from("hires")
    .update({ commission_paid_at: new Date().toISOString(), commission_note: note, commission_cents: amount })
    .eq("id", hireId);
  await logActivity(staffActor(me), "commission_paid_out", { hire_id: hireId, cents: amount, note });
  refreshMoney();
}

// Pays out everything owed to one rep in one go.
export async function payRepAll(repId: string, hireIds: string, form: FormData) {
  const me = await requireAdmin();
  const note = String(form.get("note") ?? "").trim().slice(0, 200) || null;
  let total = 0;
  // Finder's shares come in as "f:<hire id>".
  const finderIds = hireIds.split(",").filter((x) => x.startsWith("f:")).map((x) => x.slice(2));
  if (finderIds.length) {
    const { loadAgreements, finderSharesFor } = await import("@/lib/adminData");
    const { markFinderPaid } = await import("@/lib/finder");
    const shares = await finderSharesFor((await loadAgreements()).rows);
    const due = finderIds.map((id) => shares.get(id)).filter((f): f is NonNullable<typeof f> => !!f && f.staffId === repId && !f.paidAt);
    await markFinderPaid(due.map((f) => ({ hireId: f.hireId, staffId: f.staffId, cents: f.cents, how: f.how })));
    total += due.reduce((s, f) => s + f.cents, 0);
  }
  for (const id of hireIds.split(",").filter((x) => /^[0-9a-f-]{36}$/i.test(x))) {
    const { data: h } = await db().from("hires").select("commission_paid_at").eq("id", id).single();
    if (!h || h.commission_paid_at) continue;
    const amount = await commissionDue(id);
    if (amount == null) continue;
    await db().from("hires").update({ commission_paid_at: new Date().toISOString(), commission_note: note, commission_cents: amount }).eq("id", id);
    total += amount;
  }
  await logActivity(staffActor(me), "commission_paid_out_all", { rep: repId, cents: total, note });
  refreshMoney();
}

// ---------- Expenses ----------

export async function addExpense(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const what = String(form.get("what") ?? "").trim().slice(0, 120);
  const cents = dollarsToCents(String(form.get("amount") ?? ""));
  const day = String(form.get("spent_on") ?? "").trim();
  const category = String(form.get("category") ?? "Other").slice(0, 40);
  if (!what) return { error: "Say what it was for." };
  if (cents == null || cents < 0) return { error: "Enter the amount in dollars, e.g. 49.99." };
  const { error } = await db()
    .from("expenses")
    .insert({ what, amount_cents: cents, category, spent_on: /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : undefined, note: String(form.get("note") ?? "").trim().slice(0, 200) || null });
  if (error) return { error: "Couldn't save. Has the expenses table been added in Supabase?" };
  await logActivity(staffActor(me), "expense_added", { what, cents });
  refreshMoney();
  return { ok: "Added." };
}

export async function deleteExpense(id: string) {
  const me = await requireAdmin();
  await db().from("expenses").delete().eq("id", id);
  await logActivity(staffActor(me), "expense_deleted", { id });
  refreshMoney();
}

export async function undoCommissionPaid(hireId: string) {
  const me = await requireAdmin();
  await db().from("hires").update({ commission_paid_at: null, commission_note: null }).eq("id", hireId);
  await logActivity(staffActor(me), "commission_paid_undone", { hire_id: hireId });
  refreshMoney();
}

// ---------- Delete a candidate ----------

// Permanently removes a candidate (e.g. a test entry). Only when no client has
// signed for them, so agreements and payments are never lost; otherwise archive.
export async function deleteCandidate(id: string, form: FormData) {
  const me = await requireAdmin();
  clearCatalog();
  if (String(form.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    redirect(`/admin/candidates/${id}?delete_error=${encodeURIComponent("Type DELETE to confirm.")}`);
  }
  const { count } = await db().from("unlocks").select("id", { count: "exact", head: true }).eq("candidate_id", id);
  if ((count ?? 0) > 0) {
    redirect(
      `/admin/candidates/${id}?delete_error=${encodeURIComponent("A client has signed for this candidate, so their record has to stay. Set the status to Archived instead.")}`,
    );
  }
  const { data: c } = await db().from("candidates").select("*").eq("id", id).maybeSingle();
  if (!c) redirect("/admin/candidates");
  const files = [c.resume_path, c.assessment_path].filter(Boolean) as string[];
  if (files.length) await db().storage.from("resumes").remove(files);
  await db().from("onboarding_calls").delete().eq("candidate_id", id);
  const { error } = await db().from("candidates").delete().eq("id", id);
  if (error) redirect(`/admin/candidates/${id}?delete_error=${encodeURIComponent(error.message)}`);
  await logActivity(staffActor(me), "candidate_deleted", { candidate: refCode(id), name: c.full_name });
  revalidatePath("/admin");
  revalidatePath("/admin/candidates");
  revalidatePath("/candidates");
  redirect(`/admin/candidates?deleted=${encodeURIComponent(c.full_name)}`);
}

// A rep signs the rep agreement (once).
export async function signRepAgreement(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireStaff();
  if (!me.id) redirect("/admin");
  const name = String(form.get("signed_name") ?? "").trim().slice(0, 200);
  if (name.length < 3) return { error: "Type your full name to sign." };
  if (form.get("mission") !== "on" || form.get("agree") !== "on") return { error: "Tick both boxes to sign." };
  const { data: row } = await db().from("staff").select("*").eq("id", me.id).single();
  const text = repAgreementText({ brand: brandName(), repName: row?.full_name || name, ...repTerms(row, await commissionPercent()) });
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await db()
    .from("staff")
    .update({ agreement_signed_at: new Date().toISOString(), agreement_name: name, agreement_version: REP_AGREEMENT_VERSION, agreement_text: text, agreement_ip: ip })
    .eq("id", me.id);
  await logActivity(staffActor(me), "rep_agreement_signed", { version: REP_AGREEMENT_VERSION });
  await emailAdmin(`${name} signed the rep agreement`, `<p><strong>${escapeHtml(name)}</strong> (${escapeHtml(me.email)}) signed the rep agreement.</p><p><a href="${teamUrl()}/admin/agreement?id=${me.id}">See their signed copy</a></p>`);
  redirect("/admin/agreement?signed=1");
}

export async function markRequestHandled(id: string) {
  const me = await requireStaff();
  // Reps can only close requests that were sent to them.
  let q = db().from("contact_requests").update({ status: "handled", handled_by: me.name, handled_at: new Date().toISOString() }).eq("id", id);
  if (me.role !== "admin") q = me.id ? q.contains("routed_to", [me.id]) : q.eq("id", "00000000-0000-0000-0000-000000000000");
  await q;
  revalidatePath("/admin/requests");
}

// Partners get anything that has no more specific person (e.g. no rep).
export async function setPartner(staffId: string, on: boolean) {
  await requireAdmin();
  await db().from("staff").update({ is_partner: on }).eq("id", staffId);
  revalidatePath("/admin/team");
  revalidatePath(`/admin/team/${staffId}`);
}

// ---------- Assigning a rep ----------

// Heshy picks which rep a candidate belongs to (credit and commission follow).
// The rep gets a short email unless they assigned themselves.
export async function assignRep(candidateId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireStaff();
  // Reps can pass along a candidate who is theirs (for example, one who was
  // really sent by another rep). Heshy can reassign anyone.
  if (!me.manager) {
    const { data: cur } = await db().from("candidates").select("added_by").eq("id", candidateId).maybeSingle();
    const { effectiveReps } = await import("@/lib/reps");
    const who = (await effectiveReps([{ id: candidateId, added_by: cur?.added_by ?? null }])).get(candidateId);
    if (!me.id || who?.id !== me.id) return { error: "Only this candidate's rep can change this." };
  }
  const staffId = String(form.get("rep") ?? "");
  let rep: { id: string; email: string; full_name: string | null } | null = null;
  if (staffId) {
    const { data } = await db().from("staff").select("id, email, full_name, active").eq("id", staffId).maybeSingle();
    if (!data || !data.active) return { error: "That rep isn't active." };
    rep = data;
  }
  const { data: c, error } = await db()
    .from("candidates")
    .update({ added_by: rep?.id ?? null })
    .eq("id", candidateId)
    .select("full_name, email, phone, application")
    .single();
  if (error || !c) return { error: "Couldn't save. Try again." };
  await logActivity(staffActor(me), "rep_assigned", { candidate: refCode(candidateId), rep: rep?.email ?? null });
  if (rep && rep.id !== me.id && rep.email.toLowerCase() !== me.email.toLowerCase()) {
    const app = (c.application ?? {}) as Record<string, string | undefined>;
    await sendEmail({
      to: rep.email,
      ...teamExtra.assigned({
        name: rep.full_name ?? "",
        candidate: c.full_name,
        email: c.email,
        phone: c.phone,
        lookingFor: app.looking_for ?? null,
        link: `${teamUrl()}/admin/candidates/${candidateId}`,
      }),
    });
  }
  // Their upcoming call goes with them, so the new rep has the recorded link
  // and can start the recording. The old rep is told; the candidate's link stays the same.
  let moved = 0;
  if (rep && form.get("move_calls") === "on") {
    const { data: calls } = await db()
      .from("onboarding_calls")
      .select("id, staff_id, starts_at, staff(email)")
      .eq("candidate_id", candidateId)
      .eq("status", "booked")
      .gt("ends_at", new Date().toISOString());
    const { takeOverCall, closeDuplicateCalls } = await import("@/lib/calls");
    for (const k of (calls ?? []) as unknown as { id: string; staff_id: string; starts_at: string; staff: { email: string } | null }[]) {
      if (k.staff_id === rep.id) continue;
      if (!(await takeOverCall(k.id, rep.id))) continue;
      await closeDuplicateCalls(k.id);
      await logActivity(staffActor(me), "call_moved_with_rep", { call_id: k.id, to: rep.id });
      moved++;
    }
  }
  const tell = form.get("notify") === "on";
  if (rep && tell) {
    await sendEmail({ to: c.email, ...candMail.newRep({ name: c.full_name, rep: rep.full_name || "our team" }), replyTo: rep.email, fromName: rep.full_name ?? undefined });
  }
  revalidatePath("/admin/candidates");
  revalidatePath(`/admin/candidates/${candidateId}`);
  return {
    ok: rep
      ? `Assigned to ${rep.full_name || rep.email}${moved ? `. Their upcoming call moved too, and ${(rep.full_name || "they").split(" ")[0]} has the link` : ""}${tell ? ". The candidate was told" : ". The candidate wasn't emailed"}.`
      : "Unassigned.",
  };
}

// ---------- Message all reps ----------

// One email to every active rep (not Heshy), e.g. "what's new".
export async function messageAllReps(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const subject = String(form.get("subject") ?? "").trim().slice(0, 150);
  const body = String(form.get("body") ?? "").trim().slice(0, 5000);
  if (!subject || !body) return { error: "Add a subject and a message." };
  const [{ data }, hidden] = await Promise.all([db().from("staff").select("id, email, full_name, active").eq("active", true), hiddenStaffIds()]);
  const reps = ((data ?? []) as { id: string; email: string; full_name: string | null }[]).filter((s) => !isOwnerEmail(s.email) && !isCheckAccount(s.email) && !hidden.has(s.id));
  if (!reps.length) return { error: "No active reps to send to." };
  let sent = 0;
  const failed: string[] = [];
  for (const r of reps) {
    const res = await sendEmail({ to: r.email, ...teamExtra.broadcast({ name: r.full_name ?? "", subject, body }) });
    if (res.ok) sent++;
    else failed.push(r.full_name || r.email);
  }
  await logActivity(staffActor(me), "message_all_reps", { subject, sent, failed: failed.length });
  return failed.length
    ? { error: `Sent to ${sent}. Didn't go out to: ${failed.join(", ")}. Check Activity for why.` }
    : { ok: `Sent to all ${sent} rep${sent === 1 ? "" : "s"}.` };
}

// Sends the candidate agreement again (e.g. they lost the email).
export async function resendPromise(candidateId: string) {
  const me = await requireStaff();
  if (!(await canEditCandidate(me, candidateId))) return;
  const { data } = await db().from("candidates").select("*").eq("id", candidateId).single();
  if (!data || data.promise_signed_at) return;
  await requestPromise(candidateId, !!data.list_on_sign);
  await logActivity(staffActor(me), "promise_resent", { candidate: refCode(candidateId) });
  revalidatePath(`/admin/candidates/${candidateId}`);
}

// While the catalog fills up, candidates see only the candidate side of the site.
export async function setCandidatesSeeBusiness(on: boolean) {
  const me = await requireAdmin();
  await setSetting("candidates_see_business", on);
  await logActivity(me.email, "candidates_see_business", { on });
  revalidatePath("/", "layout");
}

// ---------- One-click reminders to a candidate ----------

export type ReminderKind = "assessment" | "agreement" | "book" | "resume";
const REMINDER_GAP_HOURS = 48;

export async function sendCandidateReminder(candidateId: string, kind: ReminderKind): Promise<FormState> {
  const me = await requireStaff();
  if (!(await canEditCandidate(me, candidateId))) return { error: "This candidate belongs to another rep." };
  const { data: c } = await db().from("candidates").select("*").eq("id", candidateId).maybeSingle();
  if (!c) return { error: "Couldn't find this candidate." };
  if (!(await allow(`remind:${candidateId}`, 6, 60))) return { error: SLOW_DOWN };

  // Don't send the same reminder twice in two days.
  const since = new Date(Date.now() - REMINDER_GAP_HOURS * 3600e3).toISOString();
  const { count } = await db()
    .from("activity_log")
    .select("id", { count: "exact", head: true })
    .eq("action", "candidate_reminder")
    .eq("details->>candidate", refCode(candidateId))
    .eq("details->>kind", kind)
    .gte("at", since);
  if (count) return { error: "That reminder already went out in the last two days. Give them a little time." };

  if (kind === "agreement") {
    if (c.promise_signed_at) return { error: "They've already signed their candidate agreement." };
    await requestPromise(candidateId, !!c.list_on_sign);
  } else {
    // Signed by whoever clicked (if they're a named rep), otherwise the candidate's rep.
    const rep = me.id ? { full_name: me.name, email: me.email } : await repFor(candidateId);
    const link = kind === "book" ? `${candidateUrl()}/apply/book?c=${signedToken(`cand_${candidateId}`, 30)}` : kind === "assessment" ? strengthsLink(candidateId) : undefined;
    const r = await sendEmail({
      to: c.email,
      ...candMail.reminder({ kind, name: c.full_name, rep: rep?.full_name ?? null, link }),
      replyTo: rep?.email,
      fromName: rep?.full_name ?? undefined,
    });
    if (!r.ok) return { error: `The email didn't send: ${r.error}` };
  }
  await logActivity(staffActor(me), "candidate_reminder", { candidate: refCode(candidateId), kind });
  revalidatePath(`/admin/candidates/${candidateId}`);
  return { ok: `Sent. ${String(c.full_name).split(" ")[0]} will get it in a minute.` };
}

export async function disconnectGoogleCalls() {
  const me = await requireAdmin();
  const { disconnect } = await import("@/lib/googleCalls");
  await disconnect();
  await logActivity(me.email, "google_calls_disconnected", {});
  revalidatePath("/admin/settings");
}

export async function makeTestRoom(cohost?: string): Promise<{ link?: string; error?: string; note?: string }> {
  const me = await requireAdmin();
  try {
    const { newRecordedMeeting } = await import("@/lib/googleCalls");
    const email = (cohost ?? "").trim();
    const room = await newRecordedMeeting(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null);
    if (!room) return { error: "Google isn't connected yet." };
    await logActivity(me.email, "test_meet_room", { link: room.link, cohost: email || null, cohost_result: room.cohost ?? null });
    await setSetting("last_test_room", { link: room.link, space: room.space });
    return {
      link: room.link,
      note: room.cohost ? (room.cohost.ok ? `${email} is a co-host of this room.` : `Couldn't make ${email} a co-host: ${room.cohost.error}`) : undefined,
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// What Google actually saved for some calls (for the Calls page and the candidate page).
export type RecStatus = "recorded" | "processing" | "not_recorded" | "no_call_yet" | "unknown" | "upcoming";
export async function recordingStatuses(callIds: string[]): Promise<Record<string, RecStatus>> {
  const me = await requireStaff();
  const ids = callIds.filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 30);
  if (!ids.length) return {};
  const { data } = await db().from("onboarding_calls").select("id, meet_space, starts_at, staff_id, candidate_id, status").in("id", ids);
  const { recordingStatus } = await import("@/lib/googleCalls");
  const out: Record<string, RecStatus> = {};
  await Promise.all(
    ((data ?? []) as { id: string; meet_space: string | null; starts_at: string; staff_id: string; candidate_id: string; status: string }[]).map(async (k) => {
      if (!k.meet_space || k.status === "cancelled") return;
      if (!me.manager && k.staff_id !== me.id && !(await canEditCandidate(me, k.candidate_id))) return;
      out[k.id] = Date.parse(k.starts_at) > Date.now() ? "upcoming" : await recordingStatus(k.meet_space);
    }),
  );
  return out;
}

// A rep's company Google account for calls. Saving it also makes that account the
// co-host on all their upcoming calls.
export async function setCallAccountAction(staffId: string, email: string): Promise<{ ok?: string; error?: string }> {
  const me = await requireAdmin();
  const clean = email.trim().toLowerCase();
  if (clean && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { error: "That doesn't look like an email address." };
  const { setCallAccount } = await import("@/lib/callAccounts");
  await setCallAccount(staffId, clean);
  const { data } = await db()
    .from("onboarding_calls")
    .select("id")
    .eq("staff_id", staffId)
    .eq("status", "booked")
    .not("meet_space", "is", null)
    .gte("starts_at", new Date(Date.now() - 3600e3).toISOString());
  const { cohostForCall } = await import("@/lib/calls");
  let ok = 0;
  let failed = "";
  for (const k of data ?? []) {
    const r = await cohostForCall(k.id as string);
    if (r?.ok) ok++;
    else if (r?.error) failed = r.error;
  }
  await logActivity(me.email, "call_account_set", { staff_id: staffId, email: clean, calls: ok });
  revalidatePath("/admin/team");
  if (failed) return { error: `Saved, but Google said no for some calls: ${failed}` };
  return { ok: clean ? `Saved. Added to ${ok} upcoming call${ok === 1 ? "" : "s"}.` : "Removed." };
}

// One-time and safe to repeat: make each rep a co-host of their upcoming calls' rooms.
export async function cohostUpcomingCalls(): Promise<{ lines?: string[]; error?: string }> {
  const me = await requireAdmin();
  const { data } = await db()
    .from("onboarding_calls")
    .select("id")
    .eq("status", "booked")
    .not("meet_space", "is", null)
    .gte("starts_at", new Date(Date.now() - 3600e3).toISOString());
  const { cohostForCall } = await import("@/lib/calls");
  let ok = 0;
  const failed: string[] = [];
  for (const k of data ?? []) {
    const r = await cohostForCall(k.id as string);
    if (r?.ok) ok++;
    else if (r) failed.push(r.error ?? "unknown");
  }
  await logActivity(me.email, "meet_cohosts_added", { ok, failed: failed.length });
  return { lines: [`Reps added as co-hosts on ${ok} upcoming call${ok === 1 ? "" : "s"}.`, ...(failed.length ? [`${failed.length} didn't work: ${[...new Set(failed)].join("; ")}`] : [])] };
}

export async function checkTestRoom(): Promise<{ lines?: string[]; error?: string }> {
  await requireAdmin();
  try {
    const { roomArtifacts } = await import("@/lib/googleCalls");
    const { getSetting } = await import("@/lib/settings");
    let space = (await getSetting<{ space?: string } | null>("last_test_room", null))?.space;
    if (!space) {
      // Rooms made before this button existed: find the last one from the activity log.
      const { data } = await db().from("activity_log").select("details").eq("action", "test_meet_room").order("at", { ascending: false }).limit(1);
      const link = (data?.[0]?.details as { link?: string } | undefined)?.link;
      const code = link?.split("/").pop();
      if (code) space = `spaces/${code}`;
    }
    if (!space) return { error: "Make a test room and use it first." };
    const calls = await roomArtifacts(space);
    if (!calls?.length) return { lines: ["Google hasn't recorded a call in the test room yet. If you just hung up, wait a few minutes and check again."] };
    const word = (states: string[]) =>
      !states.length ? "not there" : states.includes("FILE_GENERATED") ? "ready" : states.includes("ENDED") ? "being processed" : "in progress";
    return {
      lines: calls.map(
        (c, i) =>
          `Call ${i + 1}${c.ended ? "" : " (still going)"}: recording ${word(c.recordings)}, transcript ${word(c.transcripts)}, notes ${word(c.notes)}.`,
      ),
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// "Fix it for me" / "Polish wording" on the profile form. Suggests only; saves nothing.
export async function suggestProfileWording(
  candidateId: string | null,
  mode: "fix" | "polish",
  w: { headline: string; summary: string; highlights: string; role: string },
): Promise<{ wording?: { headline: string; summary: string; highlights: string }; error?: string }> {
  const me = await requireStaff();
  if (candidateId && !(await canEditCandidate(me, candidateId))) return { error: "This candidate belongs to another rep." };
  if (!(await allow(`wording:${me.id ?? me.email}`, 10, 60))) return { error: SLOW_DOWN };
  const { suggestWording } = await import("@/lib/polishWording");
  try {
    const clip = (x: string, n: number) => String(x ?? "").slice(0, n);
    const wording = await suggestWording(
      { headline: clip(w.headline, 300), summary: clip(w.summary, 4000), highlights: clip(w.highlights, 3000) },
      mode,
      clip(w.role, 80),
    );
    return { wording };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function draftProfileFromCall(candidateId: string): Promise<{ ok?: boolean; error?: string }> {
  const me = await requireStaff();
  if (!(await canEditCandidate(me, candidateId))) return { error: "This candidate belongs to another rep." };
  if (!(await allow(`draft:${candidateId}`, 5, 60))) return { error: SLOW_DOWN };
  const { draftFromCall } = await import("@/lib/callDraft");
  const r = await draftFromCall(candidateId);
  if (!r.ok) return { error: r.error };
  await logActivity(staffActor(me), "call_draft_requested", { candidate: refCode(candidateId) });
  revalidatePath(`/admin/candidates/${candidateId}`);
  return { ok: true };
}

async function lastTestSpace(): Promise<string | null> {
  const { getSetting } = await import("@/lib/settings");
  let space = (await getSetting<{ space?: string } | null>("last_test_room", null))?.space ?? null;
  if (!space) {
    const { data } = await db().from("activity_log").select("details").eq("action", "test_meet_room").order("at", { ascending: false }).limit(1);
    const code = (data?.[0]?.details as { link?: string } | undefined)?.link?.split("/").pop();
    if (code) space = `spaces/${code}`;
  }
  return space;
}

export async function testDraft(): Promise<{ lines?: string[]; error?: string }> {
  await requireAdmin();
  try {
    const space = await lastTestSpace();
    if (!space) return { error: "Make a test room and use it first." };
    const { roomTranscript } = await import("@/lib/googleCalls");
    const transcript = await roomTranscript(space);
    if (!transcript) return { error: "Google is still working on the transcript. Try again in a few minutes." };
    const { draftText } = await import("@/lib/callDraft");
    const d = await draftText("the candidate", "", transcript);
    return {
      lines: [
        `Headline: ${d.headline || "(nothing)"}`,
        `Summary: ${d.summary || "(nothing)"}`,
        ...d.highlights.map((h) => `• ${h}`),
        `Private notes: ${d.private_notes || "(nothing)"}`,
      ],
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// Full test of the call-to-profile chain: turns the test room's call into a
// test candidate with a finished call, then drafts their profile from it.
export async function testCandidateFromCall(): Promise<{ id?: string; error?: string }> {
  const me = await requireAdmin();
  const space = await lastTestSpace();
  if (!space) return { error: "Make a test room and use it first." };
  let staffId = me.id;
  if (!staffId) {
    const { data } = await db().from("staff").select("id").eq("email", me.email).maybeSingle();
    staffId = data?.id ?? null;
  }
  if (!staffId) return { error: "Sign in with your email link (not the admin password) to run this test." };
  const { data: cand, error } = await db()
    .from("candidates")
    .insert({ status: "draft", full_name: "Test Candidate", email: `test+${Date.now()}@example.com`, application: { looking_for: "Test from the recorded call (delete me)" }, added_by: staffId })
    .select("id")
    .single();
  if (error || !cand) return { error: `Couldn't make the test candidate: ${error?.message}` };
  const end = new Date(Date.now() - 5 * 60e3);
  await db().from("onboarding_calls").insert({
    candidate_id: cand.id,
    staff_id: staffId,
    starts_at: new Date(end.getTime() - 30 * 60e3).toISOString(),
    ends_at: end.toISOString(),
    status: "done",
    meet_space: space,
  });
  const { draftFromCall } = await import("@/lib/callDraft");
  const r = await draftFromCall(cand.id);
  if (!r.ok) return { error: r.error, id: cand.id };
  await logActivity(me.email, "test_candidate_from_call", { candidate: refCode(cand.id) });
  return { id: cand.id };
}

// A call that landed with the wrong rep: hand it to the candidate's own rep,
// if they're free then. Everyone gets fresh booking emails.
export async function handCallToOwner(callId: string) {
  const me = await requireStaff();
  const { data: k } = await db().from("onboarding_calls").select("*, candidates(added_by)").eq("id", callId).maybeSingle();
  const owner = (k?.candidates as { added_by: string | null } | null)?.added_by;
  if (!k || !owner || k.status !== "booked" || owner === k.staff_id) return;
  if (!me.manager && me.id !== k.staff_id && me.id !== owner) return;
  const { count } = await db()
    .from("onboarding_calls")
    .select("id", { count: "exact", head: true })
    .eq("staff_id", owner)
    .eq("status", "booked")
    .neq("candidate_id", k.candidate_id)
    .lt("starts_at", k.ends_at)
    .gt("ends_at", k.starts_at);
  const { withinHours } = await import("@/lib/slots");
  if (count || !(await withinHours(owner, k.starts_at, k.ends_at))) redirect("/admin/calls?hand=busy");
  const { data: was } = await db().from("staff").select("email, full_name").eq("id", k.staff_id).maybeSingle();
  await db().from("onboarding_calls").update({ staff_id: owner }).eq("id", callId);
  await (await import("@/lib/calls")).cohostForCall(callId);
  await (await import("@/lib/calls")).closeDuplicateCalls(callId);
  const { sendBookingEmails } = await import("@/lib/calls");
  await sendBookingEmails(callId, false, true, true);
  if (was?.email)
    await sendEmail({
      to: was.email,
      subject: "A call was handed back to the candidate's own rep",
      html: `<p>Thanks! The onboarding call on your calendar for ${new Date(k.starts_at).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })} now belongs to the candidate's own rep. You can remove it from your calendar.</p>`,
    });
  await logActivity(staffActor(me), "call_handed_to_owner", { call_id: callId, to: owner });
  revalidatePath("/admin/calls");
  redirect("/admin/calls?hand=done");
}

// Managers (Heshy, partners) move a booked call to another rep, telling the
// candidate or not. The reps involved are always emailed.
export async function moveCall(callId: string, form: FormData) {
  const me = await requireStaff();
  if (!me.manager) return;
  const to = String(form.get("to") ?? "");
  const tell = form.get("notify") === "on";
  const { data: k } = await db().from("onboarding_calls").select("*").eq("id", callId).maybeSingle();
  if (!k || k.status !== "booked" || !to || to === k.staff_id) redirect("/admin/calls");
  const { data: rep } = await db().from("staff").select("id, active").eq("id", to).maybeSingle();
  if (!rep?.active) redirect("/admin/calls?move=inactive");
  const { count } = await db()
    .from("onboarding_calls")
    .select("id", { count: "exact", head: true })
    .eq("staff_id", to)
    .eq("status", "booked")
    .neq("candidate_id", k.candidate_id)
    .lt("starts_at", k.ends_at)
    .gt("ends_at", k.starts_at);
  if (count) redirect("/admin/calls?move=busy");
  const { withinHours } = await import("@/lib/slots");
  const inHours = await withinHours(to, k.starts_at, k.ends_at);
  const { data: was } = await db().from("staff").select("email").eq("id", k.staff_id).maybeSingle();
  await db().from("onboarding_calls").update({ staff_id: to }).eq("id", callId);
  await (await import("@/lib/calls")).cohostForCall(callId);
  await (await import("@/lib/calls")).closeDuplicateCalls(callId);
  const { sendBookingEmails } = await import("@/lib/calls");
  await sendBookingEmails(callId, false, true, tell);
  if (was?.email)
    await sendEmail({
      to: was.email,
      subject: "A call was moved to another rep",
      html: `<p>The onboarding call on your calendar for ${new Date(k.starts_at).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })} was moved to another rep. You can remove it from your calendar.</p>`,
    });
  await logActivity(staffActor(me), "call_moved", { call_id: callId, to, told_candidate: tell });
  revalidatePath("/admin/calls");
  redirect(`/admin/calls?move=${inHours ? "done" : "outside"}${tell ? "&told=1" : ""}`);
}

// Before a resume is replaced, keep a copy of the very first one, so we always know what they sent us.
async function keepOriginalResume(candidateId: string) {
  const { data: c } = await db().from("candidates").select("resume_path, application").eq("id", candidateId).maybeSingle();
  const app = (c?.application ?? {}) as Record<string, string>;
  if (!c?.resume_path || app.original_resume_path) return;
  const ext = c.resume_path.split(".").pop();
  const to = `${candidateId}/resume-original.${ext}`;
  const { error } = await db().storage.from("resumes").copy(c.resume_path, to);
  if (!error) await db().from("candidates").update({ application: { ...app, original_resume_path: to, original_resume_at: new Date().toISOString() } }).eq("id", candidateId);
}

export async function makeCleanResumeAction(candidateId: string): Promise<{ error?: string }> {
  const me = await requireStaff();
  if (!(await canEditCandidate(me, candidateId))) return { error: "This candidate belongs to another rep." };
  const { makeCleanResume } = await import("@/lib/cleanResume");
  const r = await makeCleanResume(candidateId, me.name);
  if (!r.ok) return { error: r.error };
  revalidatePath(`/admin/candidates/${candidateId}`);
  return {};
}

export async function saveCleanResumeAction(candidateId: string, text: string): Promise<{ error?: string }> {
  const me = await requireStaff();
  if (!(await canEditCandidate(me, candidateId))) return { error: "This candidate belongs to another rep." };
  if (!String(text ?? "").trim().startsWith("#")) return { error: "Start with the name line, like: # Full Name" };
  const { saveCleanResumeText } = await import("@/lib/cleanResume");
  await saveCleanResumeText(candidateId, String(text), me.name);
  revalidatePath(`/admin/candidates/${candidateId}`);
  return {};
}

// Which resume business owners get: the file they sent, or our clean version.
export async function setOwnerResumeAction(candidateId: string, which: "clean" | "original"): Promise<{ error?: string }> {
  const me = await requireStaff();
  if (!(await canEditCandidate(me, candidateId))) return { error: "This candidate belongs to another rep." };
  const { data: c } = await db().from("candidates").select("application").eq("id", candidateId).maybeSingle();
  const app = (c?.application ?? {}) as Record<string, string>;
  if (which === "clean" && !app.clean_resume) return { error: "Make the clean version first." };
  await db().from("candidates").update({ application: { ...app, owner_resume: which } }).eq("id", candidateId);
  await logActivity(me.name, "owner_resume_set", { candidate_id: candidateId, which });
  revalidatePath(`/admin/candidates/${candidateId}`);
  return {};
}

// First sign-in from the welcome email: choose a password and you're in, in one step.
export async function welcomeStaff(token: string, _prev: FormState, form: FormData): Promise<FormState> {
  const pw = String(form.get("password") ?? "");
  if (pw.length < 8) return { error: "Use at least 8 characters." };
  const now = new Date().toISOString();
  const { data } = await db()
    .from("login_tokens")
    .update({ used_at: now })
    .eq("token_hash", hashToken(token))
    .eq("kind", "staff")
    .is("used_at", null)
    .gt("expires_at", now)
    .select("email")
    .maybeSingle();
  if (!data) return { error: "This link has expired. Ask Heshy for a new one, or use \"Email me a link\" on the sign-in page." };
  const { data: member } = await db().from("staff").select("id, active").eq("email", data.email).maybeSingle();
  if (!member || !member.active) return { error: "Your team access isn't active. Ask Heshy." };
  await db().from("staff").update({ password_hash: hashPassword(pw), last_login_at: now }).eq("id", member.id);
  await startStaffSession(member.id);
  await logActivity(`staff:${data.email}`, "staff_welcomed");
  redirect("/admin?welcome=1");
}

// Hide a test account from the Reps page, the application form, Move lists and Finance.
export async function setStaffHiddenAction(id: string, hide: boolean) {
  const me = await requireAdmin();
  const { setStaffHidden } = await import("@/lib/hiddenStaff");
  await setStaffHidden(id, hide);
  await logActivity(staffActor(me), hide ? "staff_hidden" : "staff_unhidden", { staff_id: id });
  revalidatePath("/admin/team");
  revalidatePath("/admin/reps");
}

// Heshy says an email problem is sorted (fixed the address or the inbox).
export async function clearEmailProblemAction(email: string) {
  const me = await requireStaff();
  await clearEmailProblem(email);
  await logActivity(staffActor(me), "email_problem_cleared", { to: email });
  revalidatePath("/admin/team");
  revalidatePath("/admin/candidates");
}

// An earlier-version assessment result, converted to the six and put on the candidate's profile.
export async function convertEarlierResult(logId: number) {
  const me = await requireAdmin();
  const { data: row } = await db().from("activity_log").select("at, details").eq("id", logId).eq("action", "assessment_taken").maybeSingle();
  const det = (row?.details ?? {}) as { email?: string; result?: { ranked?: { key: string; score: number }[] } };
  const { convertEarlier } = await import("@/lib/strengthsConvert");
  const letters = convertEarlier(det.result?.ranked ?? []);
  if (!row || !letters || !det.email) redirect("/admin/assessments?converted=0");
  const { data: cs } = await db().from("candidates").select("id, working_genius, application").ilike("email", det.email.trim().replace(/[%_]/g, "")).neq("status", "archived").limit(2);
  if (!cs || cs.length !== 1) redirect("/admin/assessments?converted=none");
  const c = cs[0] as { id: string; working_genius: string | null; application: Record<string, unknown> | null };
  await db()
    .from("candidates")
    .update({ working_genius: letters, application: { ...(c.application ?? {}), strengths: { letters, at: row.at, converted: true } } })
    .eq("id", c.id);
  await logActivity(staffActor(me), "strengths_converted", { candidate_id: c.id, letters, was: c.working_genius });
  revalidatePath("/admin/candidates");
  redirect(`/admin/candidates/${c.id}?converted=${letters}`);
}

// A recorded call right now: the candidate is free, so the rep starts a room and invites
// them. It counts like a booked call (My calls, Done/No-show, the profile drafted after).
export async function startCallNow(candidateId: string, emailThem: boolean): Promise<{ link?: string; error?: string; first?: string; emailed?: boolean }> {
  const me = await requireStaff();
  if (!me.id) return { error: "Sign in with your own team account to start a call." };
  if (!(await canEditCandidate(me, candidateId))) return { error: "Not found." };
  const { data: c } = await db().from("candidates").select("id, full_name, email, added_by").eq("id", candidateId).maybeSingle();
  if (!c) return { error: "Not found." };
  // Already booked around now? Use that call (same link the candidate has) instead of a second one.
  {
    const now = Date.now();
    const { data: near } = await db()
      .from("onboarding_calls")
      .select("id, staff_id, meet_link")
      .eq("candidate_id", candidateId)
      .eq("status", "booked")
      .gte("starts_at", new Date(now - 90 * 60e3).toISOString())
      .lte("starts_at", new Date(now + 3 * 3600e3).toISOString())
      .not("meet_link", "is", null)
      .order("starts_at", { ascending: true })
      .limit(1);
    const k = near?.[0] as { id: string; staff_id: string; meet_link: string } | undefined;
    if (k) {
      const { takeOverCall } = await import("@/lib/calls");
      if (k.staff_id !== me.id) await takeOverCall(k.id, me.id);
      await logActivity(staffActor(me), "call_started_now", { candidate_id: candidateId, reused: k.id });
      revalidatePath(`/admin/candidates/${candidateId}`);
      revalidatePath("/admin/calls");
      return { link: k.meet_link, first: String(c.full_name).split(" ")[0], emailed: false };
    }
  }
  const { newRecordedMeeting } = await import("@/lib/googleCalls");
  const { callEmailFor } = await import("@/lib/callAccounts");
  let room: { link: string; space: string } | null = null;
  try {
    room = await newRecordedMeeting(await callEmailFor({ id: me.id, email: me.email }));
  } catch (e) {
    await logActivity(staffActor(me), "meet_room_failed", { candidate_id: candidateId, error: (e as Error).message.slice(0, 300) });
  }
  if (!room) return { error: "Couldn't make a recorded room right now. Try again in a minute." };
  const start = new Date();
  const { error } = await db()
    .from("onboarding_calls")
    .insert({ candidate_id: candidateId, staff_id: me.id, starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 45 * 60e3).toISOString(), meet_link: room.link, meet_space: room.space });
  if (error) return { error: `Couldn't start the call: ${error.message}` };
  if (!c.added_by) await db().from("candidates").update({ added_by: me.id }).eq("id", candidateId).is("added_by", null);
  const first = String(c.full_name).split(" ")[0];
  let emailed = false;
  if (emailThem && c.email) {
    const repFirst = (me.name || "Your rep").split(" ")[0];
    const r = await sendEmail({
      to: c.email,
      subject: `Join me now: a quick video call with ${repFirst}`,
      audience: "personal",
      fromName: me.name || undefined,
      replyTo: me.email,
      html: `<p>Hi ${escapeHtml(first)},</p><p>I'm on the video call now. Tap below to join me.</p><p><a href="${room.link}" style="display:inline-block;background:#f2b300;color:#17213a;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Join the video call</a></p><p style="font-size:13px;color:#6b7590">We record the call so I can focus on you instead of taking notes. Only our team sees it.</p><p>${escapeHtml(me.name || "")}</p>`,
    });
    emailed = r.ok;
  }
  await logActivity(staffActor(me), "call_started_now", { candidate_id: candidateId, emailed });
  revalidatePath(`/admin/candidates/${candidateId}`);
  revalidatePath("/admin/calls");
  return { link: room.link, first, emailed };
}

// Start a call with someone who isn't in the system yet (a rep reaching out to someone
// they know). They're added as the rep's candidate, then the call starts like any other.
export async function startCallWithSomeone(
  name: string,
  email: string,
  phone: string,
  emailThem: boolean,
): Promise<{ link?: string; error?: string; first?: string; emailed?: boolean; candidateId?: string }> {
  const me = await requireStaff();
  if (!me.id) return { error: "Sign in with your own team account to start a call." };
  name = name.trim().slice(0, 120);
  email = email.trim().toLowerCase().slice(0, 200);
  phone = phone.trim().slice(0, 40);
  if (!name) return { error: "Add their name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Add their email, so the call and their profile go to the right person." };
  const { data: found } = await db().from("candidates").select("id").ilike("email", email.replace(/[%_]/g, "")).neq("status", "archived").limit(1);
  let id = (found?.[0]?.id as string | undefined) ?? null;
  if (id && !(await canEditCandidate(me, id))) return { error: "They're already with another rep. Ask Heshy to move them to you." };
  if (!id) {
    const { data, error } = await db()
      .from("candidates")
      .insert({ full_name: name, email, phone: phone || null, status: "applied", added_by: me.id, application: { source: "rep_call_now" } })
      .select("id")
      .single();
    if (error || !data) return { error: `Couldn't add them: ${error?.message ?? "unknown"}` };
    id = data.id as string;
    await logActivity(staffActor(me), "candidate_added", { candidate: refCode(id), via: "call_now" });
  }
  const r = await startCallNow(id, emailThem);
  return { ...r, candidateId: id };
}

// A rep points a listed candidate to a business owner they know. Email goes from the site
// in the rep's name; WhatsApp and text open on the rep's phone (we just log them).
// The candidate stays their own rep's: pointing doesn't change who gets credit.
export async function pointCandidate(
  candidateId: string,
  o: { name: string; contact: string; channel: "email" | "whatsapp" | "text"; message: string; force?: boolean; token?: string },
): Promise<{ ok?: boolean; error?: string; already?: string }> {
  const me = await requireStaff();
  const { data: c } = await db().from("candidates").select("id, status, headline").eq("id", candidateId).maybeSingle();
  if (!c || c.status !== "listed") return { error: "Only listed candidates can be sent." };
  const contact = o.contact.trim().slice(0, 200);
  const name = o.name.trim().slice(0, 80);
  const message = o.message.trim().slice(0, 3000);
  if (!contact) return { error: "Add their email or phone." };
  if (!message) return { error: "Add a message." };
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  if (o.channel === "email" && !isEmail) return { error: "That isn't an email address." };
  if (o.channel !== "email" && contact.replace(/\D/g, "").length < 10) return { error: "Add their full phone number." };
  const key = isEmail ? contact.toLowerCase() : contact.replace(/\D/g, "").slice(-10);

  // Already sent to this person? Say so, so two reps don't send the same thing twice.
  if (!o.force) {
    const { data: prev } = await db().from("activity_log").select("at, actor, details").eq("action", "candidate_pointed").eq("details->>candidate_id", candidateId).eq("details->>to_key", key).limit(1);
    const p = prev?.[0] as { at: string; actor: string; details: { by_name?: string } } | undefined;
    if (p) return { already: `${p.details.by_name ?? "Someone on the team"} already passed this candidate along to them on ${new Date(p.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.` };
  }
  if (!(await allow(`point:${me.id ?? me.email}`, 30, 60))) return { error: SLOW_DOWN };

  if (o.channel === "email") {
    const html = escapeHtml(message)
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#17213a">$1</a>')
      .split(/\n{2,}/)
      .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
      .join("");
    const r = await sendEmail({
      to: contact,
      subject: c.headline ? `Thought of you: ${c.headline}` : "A candidate I thought of for you",
      audience: "personal",
      fromName: me.name || undefined,
      replyTo: me.email,
      html: html + `<p style="font-size:12px;color:#8a93a8">Not interested in hearing about candidates? Just reply and let ${escapeHtml((me.name || "us").split(" ")[0])} know.</p>`,
    });
    if (!r.ok) return { error: `The email didn't send: ${r.error}` };
  }
  await logActivity(staffActor(me), "candidate_pointed", { candidate_id: candidateId, to_key: key, to_name: name || null, channel: o.channel, by_name: me.name || me.email, by_email: me.email, token: /^[a-z0-9]{6,16}$/.test(o.token ?? "") ? o.token : undefined });
  revalidatePath(`/admin/candidates/${candidateId}`);
  return { ok: true };
}

// From a candidate's page: email them a reminder to answer an employer's times, in the rep's name.
export async function remindToPick(meetingId: string) {
  const me = await requireStaff();
  const { data: m } = await db().from("meetings").select("unlock_id, unlocks(candidate_id)").eq("id", meetingId).maybeSingle();
  const cid = (m as unknown as { unlocks?: { candidate_id: string } } | null)?.unlocks?.candidate_id;
  if (!cid || !(await canEditCandidate(me, cid))) return;
  const { sendPickReminder } = await import("@/lib/pathEmails");
  await sendPickReminder(meetingId, { name: me.name || null, email: me.email });
  revalidatePath(`/admin/candidates/${cid}`);
}

// ---------- Gold standard (internal badge) ----------

export async function setGold(candidateId: string, on: boolean, form?: FormData) {
  const me = await requireStaff();
  if (!(await canEditCandidate(me, candidateId))) return;
  const { data: c } = await db().from("candidates").select("application").eq("id", candidateId).maybeSingle();
  if (!c) return;
  const app = { ...((c.application as Record<string, unknown> | null) ?? {}) };
  if (on) {
    const why = String(form?.get("why") ?? "").trim().slice(0, 140) || null;
    app.gold = { by: me.id ?? "admin", by_name: me.name || me.email, at: new Date().toISOString(), why };
  } else delete app.gold;
  await db().from("candidates").update({ application: app }).eq("id", candidateId);
  await logActivity(staffActor(me), on ? "gold_on" : "gold_off", { candidate_id: candidateId });
  revalidatePath(`/admin/candidates/${candidateId}`);
  revalidatePath("/admin/candidates");
}

// ---------- Reps' mobile numbers ----------

export async function savePhone(staffId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireStaff();
  if (me.id !== staffId && me.role !== "admin") return { error: "You can only change your own number." };
  const { cleanPhone, setStaffPhone } = await import("@/lib/staffPhones");
  const raw = String(form.get("phone") ?? "").trim();
  if (!raw) {
    await setStaffPhone(staffId, null);
    revalidatePath("/admin/hours");
    return { ok: "Removed." };
  }
  const phone = cleanPhone(raw);
  if (!phone) return { error: "That doesn't look like a US mobile number. Use 10 digits, like 917 555 0123." };
  await setStaffPhone(staffId, phone);
  revalidatePath("/admin/hours");
  revalidatePath(`/admin/team/${staffId}`);
  return { ok: "Saved." };
}

// The rep's first take saves by itself (when they leave the box or press Write), so
// it's never lost and every profile the site writes is built on it.
export async function saveRepTake(candidateId: string, take: string): Promise<{ ok?: boolean; error?: string }> {
  const me = await requireStaff();
  if (!(await canEditCandidate(me, candidateId))) return { error: "This candidate belongs to another rep." };
  const t = String(take ?? "").trim().slice(0, 2000);
  const { data: cur } = await db().from("candidates").select("application, status").eq("id", candidateId).maybeSingle();
  if (!cur) return { error: "Couldn't find this candidate." };
  const app = { ...((cur.application ?? {}) as Record<string, string>) };
  if ((app.rep_take ?? "") === t) return { ok: true };
  if (t) app.rep_take = t;
  else delete app.rep_take;
  await db().from("candidates").update({ application: app }).eq("id", candidateId);
  await logActivity(staffActor(me), "rep_take_saved", { candidate_id: candidateId, chars: t.length });
  return { ok: true };
}
