"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/db";
import { finderSharesFor, loadAgreements } from "@/lib/adminData";
import { markFinderPaid, setGenericCandidate, setOwnerAmount, setOwnerCredit } from "@/lib/finder";
import { db } from "@/lib/db";
import { isOwnerEmail } from "@/lib/session";
import { allReferrers, setReferrerOff } from "@/lib/referrers";
import { requireAdmin, staffActor } from "@/lib/session";

// Heshy or a manager says who brought in the business owner for one hire.
// "auto" lets the site decide again; "none" means nobody (it goes to Heshy).
export async function saveOwnerCredit(hireId: string, form: FormData) {
  const me = await requireAdmin();
  const who = String(form.get("who") ?? "auto");
  await setOwnerCredit(hireId, who === "auto" ? null : who);
  await logActivity(staffActor(me), "owner_credit_set", { hire_id: hireId, who });
  revalidatePath("/admin/payments");
}

// The owner share's dollar amount for one hire. Empty puts it back to the standard share.
export async function saveOwnerAmount(hireId: string, form: FormData) {
  const me = await requireAdmin();
  const raw = String(form.get("amount") ?? "").replace(/[$,\s]/g, "");
  const cents = raw === "" ? null : Math.round(Number(raw) * 100);
  if (cents != null && (!Number.isFinite(cents) || cents < 0)) return;
  await setOwnerAmount(hireId, cents);
  await logActivity(staffActor(me), "owner_amount_set", { hire_id: hireId, cents });
  revalidatePath("/admin/payments");
}

// Who brought the candidate for one hire: a rep, "me" (Heshy), "generic"
// (applied online, nobody), or "auto" (the candidate's own rep).
export async function saveCandidateCredit(hireId: string, form: FormData) {
  const me = await requireAdmin();
  const who = String(form.get("who") ?? "auto");
  const { data: h } = await db().from("hires").select("commission_paid_at").eq("id", hireId).maybeSingle();
  if (!h || h.commission_paid_at) return; // already paid out: leave history alone
  let repId: string | null = null;
  if (who === "me" || who === "generic") {
    const { data: staff } = await db().from("staff").select("id, email");
    repId = ((staff ?? []) as { id: string; email: string }[]).find((s) => isOwnerEmail(s.email))?.id ?? null;
  } else if (who !== "auto") repId = who;
  await db().from("hires").update({ rep_id: repId, commission_cents: null }).eq("id", hireId);
  await setGenericCandidate(hireId, who === "generic");
  await logActivity(staffActor(me), "candidate_credit_set", { hire_id: hireId, who });
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
}

// Pays out everything owed to one referral partner.
export async function payReferrer(code: string) {
  const me = await requireAdmin();
  const shares = await finderSharesFor((await loadAgreements()).rows);
  const due = [...shares.values()].filter((f) => f.staffId === `ref:${code}` && !f.paidAt);
  if (!due.length) return;
  await markFinderPaid(due.map((f) => ({ hireId: f.hireId, staffId: f.staffId, cents: f.cents, how: f.how })));
  await logActivity(staffActor(me), "referrer_paid", { code, cents: due.reduce((t, f) => t + f.cents, 0) });
  revalidatePath("/admin/payments");
}

// Turning someone off stops their link from crediting new business owners.
// Anything they already earned stays.
export async function toggleReferrer(code: string, off: boolean) {
  const me = await requireAdmin();
  if (!(await allReferrers())[code]) return;
  await setReferrerOff(code, off);
  await logActivity(staffActor(me), off ? "referrer_off" : "referrer_on", { code });
  revalidatePath("/admin/payments");
}
