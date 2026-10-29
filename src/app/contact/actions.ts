"use server";

import { db, logActivity } from "@/lib/db";
import { teamFor } from "@/lib/contact";
import { emailAdmin, escapeHtml as e, sendEmail } from "@/lib/email";
import { refCode, teamUrl } from "@/lib/format";

import { currentCandidateId, currentOwner } from "@/lib/session";

export type ContactState = { ok?: boolean; error?: string; fields?: Record<string, string> };

const KIND_LABEL = { hiring: "Hiring", work: "Looking for work", other: "Something else" } as const;

// A "contact us" request. Goes to the candidate's rep (or the partner) and to
// Heshy, and is saved in the back office so someone follows up.
export async function sendContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  const get = (k: string) => String(form.get(k) ?? "").trim().slice(0, 2000);
  const fields = { name: get("name"), email: get("email").toLowerCase(), phone: get("phone"), best_time: get("best_time"), message: get("message"), kind: get("kind") };
  if (form.get("website")) return { ok: true }; // spam trap
  if (fields.name.length < 2) return { error: "Add your name.", fields };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) return { error: "That email doesn't look quite right.", fields };
  if (!fields.message && !fields.phone) return { error: "Tell us a little about what you need, or leave a number for a callback.", fields };
  const kind = (["hiring", "work", "other"].includes(fields.kind) ? fields.kind : "other") as keyof typeof KIND_LABEL;

  const [owner, candId] = await Promise.all([currentOwner().catch(() => null), currentCandidateId().catch(() => null)]);
  // Which candidate is this about? The one they were looking at, or the candidate themselves.
  let candidateId = /^[0-9a-f-]{36}$/i.test(get("c")) ? get("c") : null;
  if (!candidateId && kind === "work" && candId) candidateId = candId;
  let candidateName: string | null = null;
  if (candidateId) {
    const { data } = await db().from("candidates").select("id, full_name").eq("id", candidateId).maybeSingle();
    candidateId = data?.id ?? null;
    candidateName = data?.full_name ?? null;
  }
  const team = await teamFor(candidateId);

  const { data: saved } = await db()
    .from("contact_requests")
    .insert({
      kind,
      name: fields.name,
      email: fields.email,
      phone: fields.phone || null,
      best_time: fields.best_time || null,
      message: fields.message || null,
      candidate_id: candidateId,
      owner_id: owner?.id ?? null,
      routed_to: team.map((t) => t.id),
    })
    .select("id")
    .single();

  const about = candidateId ? `${candidateName} (${refCode(candidateId)})` : null;
  const html = `<p style="margin:0 0 12px"><strong>${e(fields.name)}</strong> sent a request${fields.phone ? " for a callback" : ""}.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14.5px;margin:0 0 14px">
<tr><td style="padding:3px 14px 3px 0;color:#5b667e">About</td><td>${KIND_LABEL[kind]}${about ? `: ${e(about)}` : ""}</td></tr>
${owner?.company ? `<tr><td style="padding:3px 14px 3px 0;color:#5b667e">Company</td><td>${e(owner.company)}</td></tr>` : ""}
<tr><td style="padding:3px 14px 3px 0;color:#5b667e">Email</td><td>${e(fields.email)}</td></tr>
${fields.phone ? `<tr><td style="padding:3px 14px 3px 0;color:#5b667e">Phone</td><td>${e(fields.phone)}${fields.best_time ? ` (best: ${e(fields.best_time)})` : ""}</td></tr>` : ""}
</table>
${fields.message ? `<p style="margin:0 0 14px;padding-left:12px;border-left:3px solid #f2b300">${e(fields.message)}</p>` : ""}
<p style="margin:0"><a href="${teamUrl()}/admin/requests" style="color:#17213a;font-weight:bold">See all requests</a></p>`;
  const subject = `${kind === "work" ? "Candidate" : kind === "hiring" ? "Client" : "Contact"} request: ${fields.name}${about ? ` about ${candidateName}` : ""}`;
  for (const t of team) await sendEmail({ to: t.email, subject, html, replyTo: fields.email });
  await emailAdmin(subject, html, { replyTo: fields.email });
  await logActivity(owner ? `owner:${owner.email}` : `contact:${fields.email}`, "contact_request", { id: saved?.id, kind, candidate: candidateId ? refCode(candidateId) : null });
  return { ok: true };
}
