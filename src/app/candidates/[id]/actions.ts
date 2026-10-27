"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AGREEMENT_VERSION, agreementText } from "@/lib/agreement";
import { getListed, getTiers } from "@/lib/catalog";
import { db, logActivity, Unlock } from "@/lib/db";
import { emailAdmin, escapeHtml, sendEmail } from "@/lib/email";
import { brandName, feeFor, money, refCode, siteUrl } from "@/lib/format";
import { latestHire } from "@/lib/hires";
import { requireOwner } from "@/lib/session";
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
  const blocked = (priv?.never_show_to ?? "")
    .split(/[\n,]/)
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);
  const company = (owner.company ?? "").toLowerCase();
  if (company.length > 1 && blocked.some((b: string) => company.includes(b) || b.includes(company))) {
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
  const { error } = await db().from("unlocks").insert({
    owner_id: owner.id,
    candidate_id: candidateId,
    signed_name: signedName,
    agreement_version: AGREEMENT_VERSION,
    agreement_text: text,
    fee_cents: fee,
    ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
    user_agent: h.get("user-agent"),
  });
  if (error && error.code !== "23505") return { error: "Something went wrong saving your signature. Try again." };

  if (!error) {
    const ref = refCode(candidateId);
    await logActivity(`owner:${owner.email}`, "agreement_signed", { candidate: ref, fee_cents: fee });
    await sendEmail({
      to: owner.email,
      subject: `Your signed agreement for candidate ${ref}`,
      html: `<p>Here is a copy of the agreement you signed on ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}.</p>
<pre style="white-space:pre-wrap;font-family:inherit;background:#eef1f6;padding:14px;border-radius:8px">${escapeHtml(text)}

Signed: ${escapeHtml(signedName)}</pre>
<p><a href="${siteUrl()}/candidates/${candidateId}">View the candidate</a></p>`,
    });
    await emailAdmin(
      `Unlocked: ${owner.company} signed for ${priv?.full_name} (${ref})`,
      `<p><strong>${escapeHtml(owner.company ?? "")}</strong> (${escapeHtml(owner.full_name ?? "")}, ${escapeHtml(owner.email)}${owner.phone ? `, ${escapeHtml(owner.phone)}` : ""}) signed the agreement for <strong>${escapeHtml(priv?.full_name ?? "")}</strong> (${ref}). Fee: ${money(fee)}.</p>
<p><a href="${siteUrl()}/admin">Open the admin dashboard</a></p>`,
    );
  }
  redirect(`/candidates/${candidateId}?unlocked=1`);
}

export async function startHire(candidateId: string) {
  const owner = await requireOwner(`/candidates/${candidateId}`);
  const { data } = await db()
    .from("unlocks")
    .select("*")
    .eq("owner_id", owner.id)
    .eq("candidate_id", candidateId)
    .maybeSingle();
  const unlock = data as Unlock | null;
  if (!unlock) redirect(`/candidates/${candidateId}`);

  const existing = await latestHire(unlock.id);
  if (existing && (existing.status === "paid" || existing.status === "hired")) redirect(`/candidates/${candidateId}`);

  const { data: cand } = await db().from("candidates").select("full_name").eq("id", candidateId).single();
  const ref = refCode(candidateId);

  if (unlock.fee_cents == null) {
    // Fee is set by hand for this candidate: let Heshy know instead of charging.
    await logActivity(`owner:${owner.email}`, "hire_requested_manual_fee", { candidate: ref });
    await emailAdmin(
      `Ready to hire: ${owner.company} wants ${cand?.full_name} (${ref}), fee to be set`,
      `<p>${escapeHtml(owner.company ?? "")} (${escapeHtml(owner.email)}) decided to hire ${escapeHtml(cand?.full_name ?? "")} (${ref}). This candidate's fee is set by hand, so contact them with the amount.</p>`,
    );
    redirect(`/candidates/${candidateId}?hire=requested`);
  }

  const { data: hire, error } = await db()
    .from("hires")
    .insert({ unlock_id: unlock.id, amount_cents: unlock.fee_cents, status: "pending" })
    .select("id")
    .single();
  if (error || !hire) throw new Error("Could not start the payment.");

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: owner.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: unlock.fee_cents,
          product_data: {
            name: `Hiring fee: ${cand?.full_name} (${ref})`,
            description: "One-time flat fee. Refunded in full if the hire doesn't go through.",
          },
        },
      },
    ],
    metadata: { hire_id: hire.id, candidate_ref: ref, owner_email: owner.email },
    success_url: `${siteUrl()}/candidates/${candidateId}?paid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/candidates/${candidateId}?hire=cancelled`,
  });

  await db().from("hires").update({ stripe_session_id: session.id }).eq("id", hire.id);
  await logActivity(`owner:${owner.email}`, "hire_checkout_started", { candidate: ref, amount_cents: unlock.fee_cents });
  redirect(session.url!);
}
