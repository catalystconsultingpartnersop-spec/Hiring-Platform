"use server";

import { db, logActivity } from "@/lib/db";
import { owner as ownerMail } from "@/lib/emails";
import { emailAdmin, escapeHtml, sendEmail } from "@/lib/email";
import { contactPhone, refCode } from "@/lib/format";
import { requireOwner } from "@/lib/session";

export type GuidedState = { ok?: boolean; error?: string };

const HELP = {
  interview: "Interview prep and sitting in",
  offer: "Making the offer and negotiating",
  paperwork: "Paperwork and day-one setup",
  onboarding: "First 90 days plan and check-ins",
} as const;

export async function requestGuidedHiring(_prev: GuidedState, form: FormData): Promise<GuidedState> {
  const owner = await requireOwner("/hiring-help");
  const wants = Object.entries(HELP)
    .filter(([k]) => form.get(k) === "on")
    .map(([, v]) => v);
  const message = String(form.get("message") ?? "").trim().slice(0, 2000);
  const phone = String(form.get("phone") ?? "").trim().slice(0, 40) || owner.phone || "";
  const candidateId = String(form.get("candidate") ?? "");
  if (!wants.length && !message) return { error: "Tick what you'd like help with, or tell us in a sentence." };

  let candidate = "";
  if (candidateId) {
    const { data } = await db()
      .from("unlocks")
      .select("candidates(full_name)")
      .eq("owner_id", owner.id)
      .eq("candidate_id", candidateId)
      .maybeSingle();
    const name = (data as unknown as { candidates: { full_name: string } } | null)?.candidates.full_name;
    if (name) candidate = `${name} (${refCode(candidateId)})`;
  }

  await logActivity(`owner:${owner.email}`, "guided_hiring_requested", { wants, candidate });
  const sent = await emailAdmin(
    `Guided hiring request: ${owner.company}`,
    `<p><strong>${escapeHtml(owner.company ?? "")}</strong> (${escapeHtml(owner.full_name ?? "")}, ${escapeHtml(owner.email)}${phone ? `, ${escapeHtml(phone)}` : ""}) asked for guided hiring.</p>
${candidate ? `<p>Candidate: ${escapeHtml(candidate)}</p>` : ""}
${wants.length ? `<p>Wants help with:</p><ul>${wants.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul>` : ""}
${message ? `<p>Their note: ${escapeHtml(message)}</p>` : ""}
<p>Reply to this email to reach them.</p>`,
    { replyTo: owner.email },
  );
  if (!sent.ok) return { error: `That didn't go through. Text or call us at ${contactPhone()} instead.` };
  await sendEmail({ to: owner.email, ...ownerMail.guidedReceived({ name: owner.full_name }) });
  return { ok: true };
}
