import type Stripe from "stripe";
import { db, logActivity, Owner, Unlock } from "./db";
import { agreementEmailHtml } from "./agreementView";
import { emailAdmin, escapeHtml, sendEmail } from "./email";
import { money, refCode, siteUrl, teamUrl } from "./format";
import { HireDetails, markHirePaid } from "./hires";
import { emailIntroStarted } from "./pathEmails";
import { owner as ownerMail } from "./emails";
import { getSetting, setSetting } from "./settings";
import { stripe } from "./stripe";

// Card on file: owners add a card when they sign an agreement (nothing is
// charged then). The fee is charged to that card when they decide to hire,
// or by Heshy if a hire happens without payment.

function cardLabel(pm: Stripe.PaymentMethod | string | null | undefined) {
  if (!pm || typeof pm === "string" || !pm.card) return "card on file";
  const brand = pm.card.brand ? pm.card.brand[0].toUpperCase() + pm.card.brand.slice(1) : "Card";
  return `${brand === "Amex" ? "American Express" : brand} ending ${pm.card.last4}`;
}

// Cards saved with test keys don't exist in live mode (and the reverse). The first
// time the site runs with keys of a new mode, forget the old cards so owners add
// a real one. Returns true when it just cleared them.
async function ensureStripeMode() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  const mode = /^(sk|rk)_live_/.test(key) ? "live" : "test";
  const was = await getSetting<string | null>("stripe_mode", null);
  if (was === mode) return false;
  if (was !== null || mode === "live") {
    await db().from("owners").update({ stripe_customer_id: null, card_pm: null, card_label: null }).not("id", "is", null);
  }
  await setSetting("stripe_mode", mode);
  await logActivity("system", "stripe_mode", { from: was, to: mode });
  return was !== null || mode === "live";
}

async function customerFor(owner: Owner) {
  await ensureStripeMode();
  // Read it fresh: the saved customer may have just been cleared.
  const { data: fresh } = await db().from("owners").select("stripe_customer_id").eq("id", owner.id).maybeSingle();
  if (fresh?.stripe_customer_id) return fresh.stripe_customer_id as string;
  const c = await stripe().customers.create({
    email: owner.email,
    name: owner.company ?? undefined,
    metadata: { owner_id: owner.id, contact: owner.full_name ?? "" },
  });
  await db().from("owners").update({ stripe_customer_id: c.id }).eq("id", owner.id);
  return c.id;
}

// Sends the owner to Stripe to add a card for this agreement.
export async function cardSetupUrl(owner: Owner, unlockId: string, candidateId: string) {
  const customer = await customerFor(owner);
  const session = await stripe().checkout.sessions.create({
    mode: "setup",
    currency: "usd",
    customer,
    metadata: { unlock_id: unlockId, owner_id: owner.id },
    setup_intent_data: { metadata: { unlock_id: unlockId }, description: `Card on file for candidate ${refCode(candidateId)}` },
    success_url: `${siteUrl()}/api/card/done?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/candidates/${candidateId}/unlock?card=cancelled`,
  });
  return session.url!;
}

// Called when the owner comes back from Stripe (and by the webhook). Saves the
// card and unlocks the candidate. Safe to call twice.
export async function confirmCardSetup(sessionId: string): Promise<{ candidateId: string } | null> {
  const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["setup_intent.payment_method"] });
  if (session.mode !== "setup" || session.status !== "complete") return null;
  const si = session.setup_intent as Stripe.SetupIntent | null;
  if (!si || si.status !== "succeeded" || !si.payment_method) return null;
  const unlockId = session.metadata?.unlock_id;
  if (!unlockId) return null;

  const { data } = await db().from("unlocks").select("*, owners(*)").eq("id", unlockId).maybeSingle();
  if (!data) return null;
  const owner = (data as unknown as { owners: Owner }).owners;
  if (owner.stripe_customer_id && session.customer && owner.stripe_customer_id !== session.customer) return null;

  const pmId = typeof si.payment_method === "string" ? si.payment_method : si.payment_method.id;
  const label = cardLabel(si.payment_method);
  await db().from("owners").update({ card_pm: pmId, card_label: label }).eq("id", owner.id);
  await activate(data as Unlock, owner, pmId, label);
  return { candidateId: data.candidate_id };
}

// Unlocks using the card the owner already has on file.
export async function unlockWithSavedCard(unlock: Unlock, owner: Owner) {
  if (await ensureStripeMode()) return false;
  const { data: fresh } = await db().from("owners").select("card_pm, card_label").eq("id", owner.id).maybeSingle();
  if (!fresh?.card_pm) return false;
  await activate(unlock, owner, fresh.card_pm, fresh.card_label ?? "card on file");
  return true;
}

async function activate(unlock: Unlock, owner: Owner, pmId: string, label: string) {
  const { data: done } = await db()
    .from("unlocks")
    .update({ card_pm: pmId, card_label: label, confirmed_at: new Date().toISOString() })
    .eq("id", unlock.id)
    .is("confirmed_at", null)
    .select("id")
    .maybeSingle();
  if (!done) return; // already unlocked

  const ref = refCode(unlock.candidate_id);
  const { data: cand } = await db().from("candidates").select("full_name").eq("id", unlock.candidate_id).single();
  await logActivity(`owner:${owner.email}`, "agreement_signed", { candidate: ref, fee_cents: unlock.fee_cents, card: label });
  await sendEmail({
    to: owner.email,
    ...ownerMail.agreementSigned({
      name: owner.full_name,
      candidate: cand?.full_name ?? `candidate ${ref}`,
      candidateId: unlock.candidate_id,
      unlockId: unlock.id,
      card: label,
      agreementHtml: agreementEmailHtml(unlock.agreement_text, {
        name: unlock.signed_name,
        company: owner.company ?? "",
        email: owner.email,
        signedAt: unlock.signed_at,
        ip: unlock.ip,
      }),
    }),
  });

  await emailAdmin(
    `Unlocked: ${owner.company} signed for ${cand?.full_name} (${ref})`,
    `<p><strong>${escapeHtml(owner.company ?? "")}</strong> (${escapeHtml(owner.full_name ?? "")}, ${escapeHtml(owner.email)}${owner.phone ? `, ${escapeHtml(owner.phone)}` : ""}) signed the agreement for <strong>${escapeHtml(cand?.full_name ?? "")}</strong> (${ref}). Fee: ${money(unlock.fee_cents)}. Card on file: ${escapeHtml(label)}.</p>
<p><a href="${teamUrl()}/admin">Open the admin dashboard</a></p>`,
  );
  // Tell the candidate (and their rep) that someone wants to meet them.
  try {
    await emailIntroStarted(unlock.id);
  } catch (e) {
    console.error("intro email failed", e);
  }
}

// Charges the fee to the card on file for this agreement. Returns the hire id
// on success, or an error message (e.g. the card was declined).
export async function chargeCardOnFile(
  unlockId: string,
  actor: string,
  amountCents?: number,
  details: HireDetails = {},
): Promise<{ ok: true; hireId: string } | { ok: false; error: string }> {
  await ensureStripeMode();
  const { data } = await db().from("unlocks").select("*, owners(*)").eq("id", unlockId).maybeSingle();
  if (!data) return { ok: false, error: "Agreement not found." };
  const unlock = data as Unlock;
  const owner = (data as unknown as { owners: Owner }).owners;
  const amount = amountCents ?? unlock.fee_cents;
  if (amount == null || amount <= 0) return { ok: false, error: "No fee is set for this agreement yet." };
  const pm = unlock.card_pm ?? owner.card_pm;
  if (!pm || !owner.stripe_customer_id) return { ok: false, error: "There's no card on file for this agreement." };

  const { data: hire, error } = await db()
    .from("hires")
    .insert({ unlock_id: unlock.id, amount_cents: amount, status: "pending" })
    .select("id")
    .single();
  if (error || !hire) return { ok: false, error: "Could not start the charge." };

  const ref = refCode(unlock.candidate_id);
  try {
    const pi = await stripe().paymentIntents.create(
      {
        amount,
        currency: "usd",
        customer: owner.stripe_customer_id,
        payment_method: pm,
        off_session: true,
        confirm: true,
        description: `Placement fee, candidate ${ref}`,
        metadata: {
          hire_id: hire.id,
          candidate_ref: ref,
          owner_email: owner.email,
          job_title: details.jobTitle ?? "",
          start_date: details.startDate ?? "",
        },
      },
      { idempotencyKey: `hire_${hire.id}` },
    );
    if (pi.status !== "succeeded") throw new Error(`Payment status: ${pi.status}`);
    await logActivity(actor, "fee_charged_to_card", { candidate: ref, amount_cents: amount });
    await markHirePaid(hire.id, pi.id, true, details);
    return { ok: true, hireId: hire.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db().from("hires").delete().eq("id", hire.id).eq("status", "pending");
    await logActivity(actor, "card_charge_failed", { candidate: ref, amount_cents: amount, error: msg });
    return { ok: false, error: msg };
  }
}
