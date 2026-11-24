"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/db";
import { finderSharesFor, loadAgreements } from "@/lib/adminData";
import { markFinderPaid, setOwnerCredit } from "@/lib/finder";
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
