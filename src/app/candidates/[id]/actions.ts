"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AGREEMENT_VERSION, agreementText } from "@/lib/agreement";
import { getListed, getTiers } from "@/lib/catalog";
import { db, logActivity, Unlock } from "@/lib/db";
import { emailAdmin, escapeHtml } from "@/lib/email";
import { brandName, contactPhone, feeFor, refCode, siteUrl } from "@/lib/format";
import { cardSetupUrl, chargeCardOnFile, unlockWithSavedCard } from "@/lib/cards";
import { HireDetails } from "@/lib/hires";
import { latestHire } from "@/lib/hires";
import { requireOwner } from "@/lib/session";
import { isBlockedFor } from "@/lib/blocklist";
import { stripe } from "@/lib/stripe";

export type SignState = { error?: string };

export async function signAgreement(candidateId: string, _prev: SignState, form: FormData): Promise<SignState> {
  const owner = await requireOwner(`/candidates/${candidateId}/unlock`);
  const c = await getListed(candidateId);
  if (!c) return { error: "This candidate is no longer listed." };

  const signedName = String(form.get("signed_name") ?? "").trim();
  if (signedName.length < 3) return { error: "Type your full name to sign." };
  if (form.get("agree") !== "on") return { error: "Tick the box to confirm you agree." };

  // Respect companies the candidate asked never to be shown to.
  const { data: priv } = await db().from("candidates").select("never_show_to, full_name").eq("id", candidateId).single();
  if (isBlockedFor(priv?.never_show_to, owner)) {
    await logActivity(`owner:${owner.email}`, "unlock_blocked", { candidate: refCode(candidateId) });
    return { error: "This candidate isn't available to your company. Browse the others, or contact us with questions." };
  }

  const tiers = await getTiers();
  const fee = feeFor(c, tiers);
  const text = agreementText({
    brand: brandName(),
    ownerName: signedName,
    company: owner.company ?? "",
    candidateRef: refCode(candidateId),
    feeCents: fee,
  });

  const h = await headers();
  const signature = {
    signed_name: signedName,
    agreement_version: AGREEMENT_VERSION,
    agreement_text: text,
    fee_cents: fee,
    ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
    user_agent: h.get("user-agent"),
    signed_at: new Date().toISOString(),
  };

  // One agreement per owner and candidate. If they signed before but never
  // added a card, the new signature replaces the old one.
  const { data: existing } = await db()
    .from("unlocks")
    .select("*")
    .eq("owner_id", owner.id)
    .eq("candidate_id", candidateId)
    .maybeSingle();
  if (existing?.confirmed_at) redirect(`/candidates/${candidateId}`);
  const { data: row, error } = existing
    ? await db().from("unlocks").update(signature).eq("id", existing.id).select("*").single()
    : await db()
        .from("unlocks")
        .insert({ owner_id: owner.id, candidate_id: candidateId, ...signature })
        .select("*")
        .single();
  if (error || !row) return { error: "Something went wrong saving your signature. Try again." };
  const unlock = row as Unlock;

  // A card is already on file: use it, unless they asked to add a new one.
  if (owner.card_pm && form.get("new_card") !== "1") {
    await unlockWithSavedCard(unlock, owner);
    redirect(`/candidates/${candidateId}?unlocked=1`);
  }

  let url: string;
  try {
    url = await cardSetupUrl(owner, unlock.id, candidateId);
  } catch (e) {
    console.error("card setup failed", e);
    await logActivity(`owner:${owner.email}`, "card_setup_failed", { candidate: refCode(candidateId), error: String(e) });
    return { error: `We couldn't open the card form. Try again in a minute, or text or call ${contactPhone()}.` };
  }
  redirect(url);
}

// "I've decided to hire": the owner confirms on /candidates/[id]/hire.
export async function startHire(candidateId: string, form: FormData) {
  const hirePage = `/candidates/${candidateId}/hire`;
  const owner = await requireOwner(hirePage);
  const { data } = await db()
    .from("unlocks")
    .select("*")
    .eq("owner_id", owner.id)
    .eq("candidate_id", candidateId)
    .not("confirmed_at", "is", null)
    .maybeSingle();
  const unlock = data as Unlock | null;
  if (!unlock) redirect(`/candidates/${candidateId}`);

  const existing = await latestHire(unlock.id);
  if (existing && (existing.status === "paid" || existing.status === "hired")) redirect(`/candidates/${candidateId}`);
  if (form.get("confirm") !== "on") redirect(`${hirePage}?error=confirm`);

  const details: HireDetails = {
    jobTitle: String(form.get("job_title") ?? "").trim().slice(0, 120) || undefined,
    startDate: /^\d{4}-\d{2}-\d{2}$/.test(String(form.get("start_date") ?? "")) ? String(form.get("start_date")) : undefined,
  };
  const { data: cand } = await db().from("candidates").select("full_name").eq("id", candidateId).single();
  const ref = refCode(candidateId);
  await logActivity(`owner:${owner.email}`, "hire_decided", { candidate: ref, ...details });

  if (unlock.fee_cents == null) {
    // Fee is set by hand for this candidate: let Heshy know instead of charging.
    await emailAdmin(
      `Ready to hire: ${owner.company} wants ${cand?.full_name} (${ref}), fee to be set`,
      `<p>${escapeHtml(owner.company ?? "")} (${escapeHtml(owner.email)}) decided to hire ${escapeHtml(cand?.full_name ?? "")} (${ref}).${details.jobTitle ? ` Role: ${escapeHtml(details.jobTitle)}.` : ""}${details.startDate ? ` Start: ${details.startDate}.` : ""} This candidate's fee is set by hand, so contact them with the amount.</p>`,
    );
    redirect(`/candidates/${candidateId}?hire=requested`);
  }

  // Charge the card on file, unless they chose to pay with a different card.
  if (unlock.card_pm && form.get("other_card") !== "1") {
    const r = await chargeCardOnFile(unlock.id, `owner:${owner.email}`, undefined, details);
    if (r.ok) redirect(`/candidates/${candidateId}?hire=paid`);
    redirect(`${hirePage}?error=declined`);
  }

  const { data: hire, error } = await db()
    .from("hires")
    .insert({ unlock_id: unlock.id, amount_cents: unlock.fee_cents, status: "pending" })
    .select("id")
    .single();
  if (error || !hire) redirect(`${hirePage}?error=failed`);

  let url: string;
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer_email: owner.stripe_customer_id ? undefined : owner.email,
      customer: owner.stripe_customer_id ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: unlock.fee_cents,
            product_data: {
              name: `Placement fee: ${cand?.full_name} (${ref})`,
              description: "One-time flat fee under your signed agreement.",
            },
          },
        },
      ],
      metadata: {
        hire_id: hire.id,
        candidate_ref: ref,
        owner_email: owner.email,
        job_title: details.jobTitle ?? "",
        start_date: details.startDate ?? "",
      },
      success_url: `${siteUrl()}/candidates/${candidateId}?paid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}${hirePage}?error=cancelled`,
    });
    await db().from("hires").update({ stripe_session_id: session.id }).eq("id", hire.id);
    url = session.url!;
  } catch (e) {
    console.error("checkout failed", e);
    await db().from("hires").delete().eq("id", hire.id).eq("status", "pending");
    redirect(`${hirePage}?error=failed`);
  }
  await logActivity(`owner:${owner.email}`, "hire_checkout_started", { candidate: ref, amount_cents: unlock.fee_cents });
  redirect(url);
}
