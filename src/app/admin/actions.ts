"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, logActivity } from "@/lib/db";
import { escapeHtml, sendEmail } from "@/lib/email";
import { brandName, money, refCode } from "@/lib/format";
import { checkAdminPassword, endAdminSession, requireAdmin, startAdminSession } from "@/lib/session";
import { stripe } from "@/lib/stripe";
import { describe } from "@/lib/strengths";

export type FormState = { error?: string; ok?: string };

// ---------- Sign in ----------

export async function adminLogin(_prev: FormState, form: FormData): Promise<FormState> {
  // Small delay makes password guessing slow.
  await new Promise((r) => setTimeout(r, 600));
  if (!checkAdminPassword(String(form.get("password") ?? ""))) {
    await logActivity("system", "admin_login_failed");
    return { error: "That password isn't right." };
  }
  await startAdminSession();
  await logActivity("admin", "admin_signed_in");
  redirect("/admin");
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

const RESUME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export async function saveCandidate(id: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
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
    fee_override_cents: dollarsToCents(get("fee_override")),
    full_name: get("full_name"),
    email: get("email").toLowerCase(),
    phone: get("phone") || null,
    linkedin_url: get("linkedin_url") || null,
    full_profile: get("full_profile") || null,
    never_show_to: get("never_show_to") || null,
    admin_notes: get("admin_notes") || null,
    updated_at: new Date().toISOString(),
  };

  if (!record.full_name || !record.email) return { error: "Name and email are required." };
  if (status === "listed") {
    const missing = [
      !record.headline && "headline",
      !record.role_category && "role",
      (record.strengths as string[]).length === 0 && !describe(record.working_genius as string | null) && "Working Genius result (or your own Wired for words)",
    ].filter(Boolean);
    if (missing.length) return { error: `To list this candidate, fill in: ${missing.join(", ")}. Nothing was saved.` };
  }

  let candidateId = id;
  if (id) {
    const { data: before } = await db().from("candidates").select("status, listed_at").eq("id", id).single();
    if (status === "listed" && !before?.listed_at) record.listed_at = new Date().toISOString();
    const { error } = await db().from("candidates").update(record).eq("id", id);
    if (error) return { error: `Could not save: ${error.message}` };
    if (before?.status !== status) await logActivity("admin", "candidate_status", { candidate: refCode(id), from: before?.status, to: status });
  } else {
    if (status === "listed") record.listed_at = new Date().toISOString();
    record.consent_at = form.get("consent") === "on" ? new Date().toISOString() : null;
    const { data, error } = await db().from("candidates").insert(record).select("id").single();
    if (error || !data) return { error: `Could not save: ${error?.message}` };
    candidateId = data.id;
    await logActivity("admin", "candidate_created", { candidate: refCode(data.id) });
  }

  const resume = form.get("resume");
  if (resume instanceof File && resume.size > 0) {
    if (!RESUME_TYPES[resume.type]) return { error: "Resume must be a PDF or Word file. Everything else was saved." };
    const path = `${candidateId}/resume.${RESUME_TYPES[resume.type]}`;
    const { error } = await db()
      .storage.from("resumes")
      .upload(path, Buffer.from(await resume.arrayBuffer()), { contentType: resume.type, upsert: true });
    if (error) return { error: "Saved, but the resume upload failed. Try uploading it again." };
    await db().from("candidates").update({ resume_path: path }).eq("id", candidateId);
  }

  revalidatePath("/admin");
  revalidatePath("/candidates");
  if (!id) redirect(`/admin/candidates/${candidateId}?saved=${status}`);
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

export async function refundHire(hireId: string) {
  await requireAdmin();
  const { data: hire } = await db()
    .from("hires")
    .select("id, status, amount_cents, stripe_payment_intent, unlocks(candidate_id, owners(email, full_name))")
    .eq("id", hireId)
    .single();
  if (!hire || hire.status !== "paid" || !hire.stripe_payment_intent) return;

  await stripe().refunds.create({ payment_intent: hire.stripe_payment_intent });
  await db().from("hires").update({ status: "refunded", refunded_at: new Date().toISOString() }).eq("id", hireId).eq("status", "paid");

  const u = (hire as unknown as { unlocks: { candidate_id: string; owners: { email: string; full_name: string } } }).unlocks;
  await logActivity("admin", "hire_refunded", { hire_id: hireId, candidate: refCode(u.candidate_id), amount_cents: hire.amount_cents });
  await sendEmail({
    to: u.owners.email,
    subject: `Refund of ${money(hire.amount_cents)} issued`,
    html: `<p>Hi ${escapeHtml(u.owners.full_name ?? "")},</p><p>We've refunded ${money(hire.amount_cents)} for candidate ${refCode(u.candidate_id)}. It usually shows on your card within 5–10 business days.</p><p>${escapeHtml(brandName())}</p>`,
  });
  revalidatePath("/admin");
}
