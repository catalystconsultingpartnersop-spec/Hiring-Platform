"use server";

import { clearCatalog } from "@/lib/catalog";

import { allow, SLOW_DOWN } from "@/lib/throttle";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, logActivity } from "@/lib/db";
import { emailAdmin, escapeHtml, sendEmail } from "@/lib/email";
import { candidateHired, hireSummaryHtml } from "@/lib/notify";
import { tellShortlisters } from "@/lib/shortlist";
import { commissionOf, commissionTerms, HireRow, StaffLite } from "@/lib/adminData";
import { brandName, money, refCode, teamUrl, workEmailDomain } from "@/lib/format";

import {
  checkAdminPassword,
  checkPasswordHash,
  endAdminSession,
  hashPassword,
  hashToken,
  newLoginToken,
  isOwnerEmail,
  requireAdmin,
  type Staff,
  requireStaff,
  staffActor,
  startStaffSession,
} from "@/lib/session";
import { stripe } from "@/lib/stripe";
import { cancelCall } from "@/lib/calls";
import { chargeCardOnFile } from "@/lib/cards";
import { commissionPercent, setSetting } from "@/lib/settings";
import { receiptNumber } from "@/lib/receipt";
import { owner as ownerMail, team as teamMail, teamExtra } from "@/lib/emails";
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
    headline: get("headline") || null,
    role_category: get("role_category") || null,
    industry: get("industry") || null,
    level: get("level") || null,
    location_region: get("location_region") || null,
    work_mode: get("work_mode") || null,
    salary_min: toInt(get("salary_min")),
    salary_max: toInt(get("salary_max")),
    strengths: listFrom(get("strengths"), /[,\n]/),
    working_genius: get("working_genius") || null,
    summary: get("summary") || null,
    highlights: listFrom(get("highlights"), /\n/),
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
      !describe(record.working_genius as string | null) && "their Working Genius result (at least the top two)",
    ].filter(Boolean);
    if (missing.length) return { error: `To list this candidate, fill in: ${missing.join(", ")}. Nothing was saved.` };
  }

  let candidateId = id;
  let merged = false;
  if (id) {
    const { data: before } = await db().from("candidates").select("status, listed_at").eq("id", id).single();
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

  const resume = form.get("resume");
  let resumeProblem = "";
  if (resume instanceof File && resume.size > 0) {
    const kind = resumeKind(resume);
    if (!kind) resumeProblem = "the resume needs to be a PDF or Word file";
    else if (resume.size > 4 * 1024 * 1024) resumeProblem = "the resume is over 4 MB";
    else {
      const path = `${candidateId}/resume.${kind}`;
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

  revalidatePath("/admin");
  revalidatePath("/candidates");
  clearCatalog();
  // A new candidate always goes to their page, so saving again never makes a duplicate.
  // Their Working Genius report (team only, never shown to clients).
  const report = form.get("assessment");
  if (report instanceof File && report.size > 0) {
    const n = report.name.toLowerCase();
    const ext = report.type === "application/pdf" || n.endsWith(".pdf") ? "pdf" : /\.(png|jpe?g)$/.test(n) || report.type.startsWith("image/") ? (n.endsWith(".png") || report.type === "image/png" ? "png" : "jpg") : null;
    if (!ext) resumeProblem = "the Working Genius report needs to be a PDF or a photo";
    else if (report.size > 6 * 1024 * 1024) resumeProblem = "the Working Genius report is over 6 MB";
    else {
      const path = `${candidateId}/assessment.${ext}`;
      const type = ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : "image/jpeg";
      const { error } = await db().storage.from("resumes").upload(path, Buffer.from(await report.arrayBuffer()), { contentType: type, upsert: true });
      if (error) resumeProblem = `the Working Genius report didn't upload (${error.message})`;
      else await db().from("candidates").update({ assessment_path: path }).eq("id", candidateId);
    }
  }
  if (!id) redirect(`/admin/candidates/${candidateId}?saved=${status}${merged ? "&merged=1" : ""}${resumeProblem ? `&resume=${encodeURIComponent(resumeProblem)}` : ""}`);
  if (resumeProblem) return { error: `Saved, but ${resumeProblem}. Try attaching it again.` };
  return {
    ok: status === "listed" ? "Saved. They're live in the catalog." : `Saved as ${status}. Owners won't see them until the status is Listed.`,
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
  if (!email.endsWith(`@${domain}`) || !/^[^\s@]+@[^\s@]+$/.test(email)) return { error: `Enter their @${domain} address.` };
  const { data: m } = await db().from("staff").select("*").eq("id", staffId).single();
  if (!m) return { error: "Not found." };
  if (m.email === email) return { ok: "They're already on that email." };
  const { data: taken } = await db().from("staff").select("id").eq("email", email).maybeSingle();
  if (taken) return { error: "Someone on the team already uses that email." };
  const { error } = await db().from("staff").update({ email }).eq("id", staffId);
  if (error) return { error: `Could not switch: ${error.message}` };
  await logActivity(staffActor(me), "work_email_set", { staff: staffId, from: m.email, to: email });
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

  const rows: { staff_id: string; weekday: number; start_minute: number; end_minute: number }[] = [];
  for (let d = 0; d < 7; d++) {
    if (form.get(`on_${d}`) !== "on") continue;
    const start = Number(form.get(`start_${d}`));
    const end = Number(form.get(`end_${d}`));
    if (!(end > start)) return { error: "Each day's end time needs to be after its start time." };
    if (end - start < 45) return { error: "Each day needs at least 45 minutes for one call." };
    rows.push({ staff_id: me.id, weekday: d, start_minute: start, end_minute: end });
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
  await logActivity(staffActor(me), "hours_saved", { days: rows.length });
  revalidatePath("/admin/hours");
  return {
    ok: rows.length
      ? `Saved. Candidates can now book you on ${rows.length} ${rows.length === 1 ? "day" : "days"} a week.`
      : "Saved. You have no hours set, so candidates can't book you right now.",
  };
}

// ---------- Onboarding calls ----------

async function myCallOrNull(callId: string) {
  const me = await requireStaff();
  const { data } = await db().from("onboarding_calls").select("id, staff_id, status").eq("id", callId).maybeSingle();
  if (!data) return null;
  if (me.role !== "admin" && data.staff_id !== me.id) return null; // reps only touch their own calls
  return { me, call: data };
}

export async function markCall(callId: string, status: "done" | "no_show") {
  const found = await myCallOrNull(callId);
  if (!found) return;
  await db().from("onboarding_calls").update({ status, updated_at: new Date().toISOString() }).eq("id", callId);
  await logActivity(staffActor(found.me), `onboarding_call_${status}`, { call_id: callId });
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
  const me = await requireAdmin();
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
  revalidatePath("/admin/candidates");
  revalidatePath(`/admin/candidates/${candidateId}`);
  return { ok: rep ? `Assigned to ${rep.full_name || rep.email}.` : "Unassigned." };
}

// ---------- Message all reps ----------

// One email to every active rep (not Heshy), e.g. "what's new".
export async function messageAllReps(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const subject = String(form.get("subject") ?? "").trim().slice(0, 150);
  const body = String(form.get("body") ?? "").trim().slice(0, 5000);
  if (!subject || !body) return { error: "Add a subject and a message." };
  const { data } = await db().from("staff").select("email, full_name, active").eq("active", true);
  const reps = ((data ?? []) as { email: string; full_name: string | null }[]).filter((s) => !isOwnerEmail(s.email));
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
