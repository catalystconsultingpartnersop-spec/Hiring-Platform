"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, logActivity } from "@/lib/db";
import { emailAdmin, escapeHtml, sendEmail } from "@/lib/email";
import { candidateHired, hireSummaryHtml } from "@/lib/notify";
import { brandName, money, refCode, teamUrl } from "@/lib/format";
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
  const record: Record<string, unknown> = {
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
    if (before?.status === "hired" && status === "listed") {
      await logActivity(actor, "candidate_relisted_after_hire", { candidate: refCode(id) });
    }
  } else {
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
  // A new candidate always goes to their page, so saving again never makes a duplicate.
  if (!id) redirect(`/admin/candidates/${candidateId}?saved=${status}${resumeProblem ? `&resume=${encodeURIComponent(resumeProblem)}` : ""}`);
  if (resumeProblem) return { error: `Saved, but ${resumeProblem}. Try attaching it again.` };
  return {
    ok: status === "listed" ? "Saved. They're live in the catalog." : `Saved as ${status}. Owners won't see them until the status is Listed.`,
  };
}

// ---------- Fees ----------

export async function saveTiers(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
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
  const { data } = await db().from("fee_tiers").select("sort").order("sort", { ascending: false }).limit(1);
  await db().from("fee_tiers").insert({ max_salary: null, fee_cents: null, sort: (data?.[0]?.sort ?? 0) + 1 });
  revalidatePath("/admin/settings");
}

export async function removeTier(id: string) {
  await requireAdmin();
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
    subject: `Refund of ${money(hire!.amount_cents)} issued`,
    html: `<p>Hi ${escapeHtml((u.owners.full_name ?? "").split(" ")[0])},</p><p>We've refunded <strong>${money(hire!.amount_cents)}</strong> for candidate ${refCode(u.candidate_id)} (receipt ${receiptNumber(hireId)}). It usually shows on your card within 5–10 business days.</p><p>Questions? Just reply to this email.</p><p>${escapeHtml(brandName())}</p>`,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/clients");
  go(`refunded=${encodeURIComponent(money(hire!.amount_cents))}`);
}

// ---------- Team ----------

export async function addStaff(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const full_name = String(form.get("full_name") ?? "").trim();
  const role = form.get("role") === "admin" ? "admin" : "rep";
  if (!full_name) return { error: "Enter their name." };
  if (isOwnerEmail(email)) return { error: "That's the owner's email. It's already on the team." };
  if (role === "admin" && !me.owner) return { error: "Only Heshy can add admins." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  const { error } = await db()
    .from("staff")
    .upsert({ email, full_name, role, active: true }, { onConflict: "email" });
  if (error) return { error: `Could not add them: ${error.message}` };
  await logActivity(staffActor(me), "staff_added", { email, role });
  const { token, hash } = newLoginToken();
  await db()
    .from("login_tokens")
    .insert({ token_hash: hash, email, kind: "staff", expires_at: new Date(Date.now() + 7 * 864e5).toISOString() });
  await sendEmail({
    to: email,
    subject: `You've been added to the ${brandName()} team`,
    html: `<p>Hi ${escapeHtml(full_name.split(" ")[0])},</p>
<p>You now have access to the ${escapeHtml(brandName())} back office, where you'll set your hours for onboarding calls and add candidates.</p>
<p><a href="${teamUrl()}/admin/verify?token=${token}" style="display:inline-block;background:#17213a;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Set your password</a></p>
<p style="color:#4a5570;font-size:13px">This link works once, for 7 days. After that, sign in at ${teamUrl()}/admin/login with your email and password.</p>`,
  });
  revalidatePath("/admin/team");
  return { ok: `${full_name} was added and emailed a sign-in link.` };
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

export async function setCommissionPercent(form: FormData) {
  const me = await requireAdmin();
  const pct = Number(String(form.get("percent") ?? "").replace("%", "").trim());
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return;
  await setSetting("commission_percent", Math.round(pct * 100) / 100);
  await logActivity(staffActor(me), "commission_rate_set", { percent: pct });
  refreshMoney();
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

export async function markCommissionPaid(hireId: string, form: FormData) {
  const me = await requireAdmin();
  const note = String(form.get("note") ?? "").trim().slice(0, 200) || null;
  const pct = await commissionPercent();
  const { data: h } = await db().from("hires").select("amount_cents, commission_cents").eq("id", hireId).single();
  if (!h) return;
  // Freeze the amount that was paid, so changing the default rate later doesn't change history.
  const amount = h.commission_cents ?? Math.round((h.amount_cents * pct) / 100);
  await db()
    .from("hires")
    .update({ commission_paid_at: new Date().toISOString(), commission_note: note, commission_cents: amount })
    .eq("id", hireId);
  await logActivity(staffActor(me), "commission_paid_out", { hire_id: hireId, cents: amount, note });
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
  if (String(form.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    redirect(`/admin/candidates/${id}?delete_error=${encodeURIComponent("Type DELETE to confirm.")}`);
  }
  const { count } = await db().from("unlocks").select("id", { count: "exact", head: true }).eq("candidate_id", id);
  if ((count ?? 0) > 0) {
    redirect(
      `/admin/candidates/${id}?delete_error=${encodeURIComponent("A client has signed for this candidate, so their record has to stay. Set the status to Archived instead.")}`,
    );
  }
  const { data: c } = await db().from("candidates").select("full_name, resume_path").eq("id", id).maybeSingle();
  if (!c) redirect("/admin/candidates");
  if (c.resume_path) await db().storage.from("resumes").remove([c.resume_path]);
  await db().from("onboarding_calls").delete().eq("candidate_id", id);
  const { error } = await db().from("candidates").delete().eq("id", id);
  if (error) redirect(`/admin/candidates/${id}?delete_error=${encodeURIComponent(error.message)}`);
  await logActivity(staffActor(me), "candidate_deleted", { candidate: refCode(id), name: c.full_name });
  revalidatePath("/admin");
  revalidatePath("/admin/candidates");
  revalidatePath("/candidates");
  redirect(`/admin/candidates?deleted=${encodeURIComponent(c.full_name)}`);
}
