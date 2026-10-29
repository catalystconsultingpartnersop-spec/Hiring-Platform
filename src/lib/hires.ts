import { db, Hire, logActivity } from "./db";
import { stripe } from "./stripe";
import { emailAdmin, escapeHtml, sendEmail } from "./email";
import { brandName, money, refCode, teamUrl } from "./format";
import { receiptEmailHtml, receiptNumber } from "./receipt";
import { candidateHired, hireSummaryHtml } from "./notify";

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
  return markHirePaid(hireId, paymentIntent ?? null, false, {
    jobTitle: session.metadata?.job_title || undefined,
    startDate: session.metadata?.start_date || undefined,
  });
}

// Marks a pending hire paid and sends the receipt. Safe to call twice.
export type HireDetails = { jobTitle?: string; startDate?: string };

export async function markHirePaid(hireId: string, paymentIntent: string | null, viaCardOnFile = false, details: HireDetails = {}) {
  const { data: hire } = await db()
    .from("hires")
    .update({ status: "paid", paid_at: new Date().toISOString(), stripe_payment_intent: paymentIntent })
    .eq("id", hireId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (!hire) return { ok: true as const, already: true };

  const { data: unlock } = await db()
    .from("unlocks")
    .select("candidate_id, card_label, signed_at, owners(email, full_name, company, phone), candidates(full_name)")
    .eq("id", hire.unlock_id)
    .single();
  const owner = (unlock as unknown as { owners: { email: string; full_name: string; company: string; phone: string | null } }).owners;
  const cand = (unlock as unknown as { candidates: { full_name: string } }).candidates;
  const card = (unlock as unknown as { card_label: string | null }).card_label;
  const signedAt = (unlock as unknown as { signed_at: string }).signed_at;
  const ref = refCode(unlock!.candidate_id);

  await logActivity(`owner:${owner.email}`, "hire_paid", { hire_id: hireId, candidate: ref, amount_cents: hire.amount_cents });
  const notice = await candidateHired(unlock!.candidate_id, owner, hire.amount_cents, details);
  // Credit the rep who brought the candidate in (for commission).
  if (notice.rep) await db().from("hires").update({ rep_id: notice.rep.id }).eq("id", hireId);

  await sendEmail({
    to: owner.email,
    subject: `Receipt ${receiptNumber(hireId)}: ${money(hire.amount_cents)} for ${cand.full_name}`,
    html: `<p>Hi ${escapeHtml((owner.full_name ?? "").split(" ")[0])},</p>
<p>Payment received, so you're all set to hire ${escapeHtml(cand.full_name)}. Your receipt is below.</p>
${receiptEmailHtml({
  hireId,
  paidAt: hire.paid_at ?? new Date().toISOString(),
  amountCents: hire.amount_cents,
  company: owner.company ?? "",
  ownerName: owner.full_name ?? "",
  ownerEmail: owner.email,
  candidateName: cand.full_name,
  candidateRef: ref,
  paidWith: viaCardOnFile && card ? card : "Card, paid on Stripe",
  agreementSignedAt: signedAt,
  ...details,
})}
<p>Congratulations, and thank you.<br>${escapeHtml(brandName())}</p>`,
  });
  await emailAdmin(
    `Paid: ${owner.company} is hiring ${cand.full_name} (${money(hire.amount_cents)})`,
    `<p><strong>${escapeHtml(owner.company ?? "")}</strong> (${escapeHtml(owner.full_name ?? "")}, ${escapeHtml(owner.email)}) paid ${money(hire.amount_cents)} to hire <strong>${escapeHtml(cand.full_name)}</strong> (${ref}).</p>
${details.jobTitle ? `<p>Role: ${escapeHtml(details.jobTitle)}</p>` : ""}${details.startDate ? `<p>Expected start: ${escapeHtml(details.startDate)}</p>` : ""}
${hireSummaryHtml(notice)}
<p><a href="${teamUrl()}/admin">Open the admin dashboard</a></p>`,
  );
  return { ok: true as const, already: false };
}
