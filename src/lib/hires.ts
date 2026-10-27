import { db, Hire, logActivity } from "./db";
import { stripe } from "./stripe";
import { emailAdmin, escapeHtml, sendEmail } from "./email";
import { brandName, money, refCode, siteUrl } from "./format";

export async function latestHire(unlockId: string): Promise<Hire | null> {
  const { data } = await db()
    .from("hires")
    .select("*")
    .eq("unlock_id", unlockId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Hire) ?? null;
}

// Confirms a Stripe Checkout session really was paid, then marks the hire paid
// and sends the receipt. Safe to call more than once for the same session.
export async function markPaidFromSession(sessionId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") return { ok: false as const, reason: "not_paid" };
  const hireId = session.metadata?.hire_id;
  if (!hireId) return { ok: false as const, reason: "no_hire" };

  const { data: hire } = await db().from("hires").select("*").eq("id", hireId).maybeSingle();
  if (!hire) return { ok: false as const, reason: "no_hire" };
  if (hire.stripe_session_id !== sessionId) return { ok: false as const, reason: "mismatch" };
  if (hire.status !== "pending") return { ok: true as const, already: true };

  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  const { data: updated } = await db()
    .from("hires")
    .update({ status: "paid", paid_at: new Date().toISOString(), stripe_payment_intent: paymentIntent ?? null })
    .eq("id", hireId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (!updated) return { ok: true as const, already: true };

  const { data: unlock } = await db()
    .from("unlocks")
    .select("candidate_id, owners(email, full_name, company), candidates(full_name)")
    .eq("id", hire.unlock_id)
    .single();
  const owner = (unlock as unknown as { owners: { email: string; full_name: string; company: string } }).owners;
  const cand = (unlock as unknown as { candidates: { full_name: string } }).candidates;
  const ref = refCode(unlock!.candidate_id);

  await logActivity(`owner:${owner.email}`, "hire_paid", { hire_id: hireId, candidate: ref, amount_cents: hire.amount_cents });

  await sendEmail({
    to: owner.email,
    subject: `Receipt: ${money(hire.amount_cents)} for ${cand.full_name} (${ref})`,
    html: `<p>Hi ${escapeHtml(owner.full_name ?? "")},</p>
<p>We received your payment of <strong>${money(hire.amount_cents)}</strong> for hiring ${escapeHtml(cand.full_name)} (${ref}).</p>
<p>Go ahead and make the hire. If it doesn't go through, reply to this email and we'll refund you in full.</p>
<p>Thank you,<br>${escapeHtml(brandName())}</p>`,
  });
  await emailAdmin(
    `Paid: ${owner.company} is hiring ${cand.full_name} (${money(hire.amount_cents)})`,
    `<p><strong>${escapeHtml(owner.company ?? "")}</strong> (${escapeHtml(owner.full_name ?? "")}, ${escapeHtml(owner.email)}) paid ${money(hire.amount_cents)} to hire <strong>${escapeHtml(cand.full_name)}</strong> (${ref}).</p>
<p><a href="${siteUrl()}/admin">Open the admin dashboard</a></p>`,
  );
  return { ok: true as const, already: false };
}
