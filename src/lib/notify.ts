import { tellShortlisters } from "./shortlist";
import { db, logActivity } from "./db";
import { owner as ownerMail } from "./emails";
import { escapeHtml, sendEmail } from "./email";
import { isOwnerEmail } from "./session";
import { money, refCode, siteUrl, teamUrl } from "./format";
import type { HireDetails } from "./hires";

type Rep = { id: string; email: string; full_name: string | null; active: boolean };

// The rep who brought a candidate in: whoever added them, otherwise whoever
// took their onboarding call. Used for commission and hire alerts.
export async function repFor(candidateId: string): Promise<Rep | null> {
  const { data: c } = await db().from("candidates").select("added_by").eq("id", candidateId).maybeSingle();
  if (c?.added_by) {
    const { data } = await db().from("staff").select("id, email, full_name, active").eq("id", c.added_by).maybeSingle();
    if (data) return data as Rep;
  }
  const { data: call } = await db()
    .from("onboarding_calls")
    .select("staff(id, email, full_name, active)")
    .eq("candidate_id", candidateId)
    .neq("status", "cancelled")
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (call as unknown as { staff: Rep | null } | null)?.staff ?? null;
}

export type HireNotice = { rep: Rep | null; repEmailed: boolean; toldOwners: string[] };

// A candidate was hired. One place that does everything, whichever way the
// hire happened (owner paid, card charged, or staff marked them hired):
// take them off the catalog, tell other owners who were considering them,
// and tell their rep. Heshy is told by the caller.
export async function candidateHired(
  candidateId: string,
  owner: { email: string; full_name: string | null; company: string | null; phone?: string | null } | null,
  amountCents: number | null,
  details: HireDetails,
): Promise<HireNotice> {
  await db()
    .from("candidates")
    .update({ status: "hired", updated_at: new Date().toISOString() })
    .eq("id", candidateId)
    .neq("status", "hired");
  await logActivity("system", "candidate_marked_hired", { candidate: refCode(candidateId) });
  const toldOwners = await tellOtherOwners(candidateId, owner?.email ?? "");
  await tellShortlisters(candidateId, "hired");

  const rep = await repFor(candidateId);
  if (!rep || !rep.active || isOwnerEmail(rep.email)) return { rep, repEmailed: false, toldOwners };
  const { data: c } = await db().from("candidates").select("full_name, email, phone").eq("id", candidateId).single();
  if (!c) return { rep, repEmailed: false, toldOwners };
  const first = (rep.full_name ?? "").split(" ")[0] || "there";
  const who = owner?.company ? `<strong>${escapeHtml(owner.company)}</strong>` : "an employer";
  const sent = await sendEmail({
    to: rep.email,
    subject: owner?.company ? `${c.full_name} is being hired by ${owner.company}` : `${c.full_name} has been hired`,
    html: `<p>Hi ${escapeHtml(first)},</p>
<p>Good news: ${who} is hiring <strong>${escapeHtml(c.full_name)}</strong> (${refCode(candidateId)})${amountCents ? ` and paid the ${money(amountCents)} fee` : ""}. ${escapeHtml(c.full_name.split(" ")[0])} is now off the site.</p>
<table style="border-collapse:collapse;font-size:14px">
${owner ? `<tr><td style="padding:4px 14px 4px 0;color:#4a5570">Employer</td><td>${escapeHtml(owner.company ?? "")}, ${escapeHtml(owner.full_name ?? "")}, ${escapeHtml(owner.email)}${owner.phone ? `, ${escapeHtml(owner.phone)}` : ""}</td></tr>` : ""}
${details.jobTitle ? `<tr><td style="padding:4px 14px 4px 0;color:#4a5570">Role</td><td>${escapeHtml(details.jobTitle)}</td></tr>` : ""}
${details.startDate ? `<tr><td style="padding:4px 14px 4px 0;color:#4a5570">Expected start</td><td>${escapeHtml(details.startDate)}</td></tr>` : ""}
<tr><td style="padding:4px 14px 4px 0;color:#4a5570">Candidate</td><td>${escapeHtml(c.email)}${c.phone ? `, ${escapeHtml(c.phone)}` : ""}</td></tr>
</table>
<p><strong>Please check in with ${escapeHtml(c.full_name.split(" ")[0])}</strong> in the next day or two: congratulate them, make sure the offer arrived, and let us know if anything looks off.</p>
<p><a href="${teamUrl()}/admin/candidates/${candidateId}">Open their profile</a></p>`,
  });
  await logActivity("system", "rep_notified_of_hire", { candidate: refCode(candidateId), rep: rep.email });
  return { rep, repEmailed: sent.ok, toldOwners };
}

// The lines added to Heshy's email about what happened after a hire.
export function hireSummaryHtml(n: HireNotice) {
  const repLine = !n.rep
    ? "No rep is attached to this candidate."
    : isOwnerEmail(n.rep.email)
      ? "You brought this candidate in."
      : `${escapeHtml(n.rep.full_name || n.rep.email)} (their rep) ${n.repEmailed ? "was emailed" : "could not be emailed; tell them directly"}.`;
  return `<p style="margin-top:16px;padding:12px 14px;background:#eef1f6;border-radius:8px;font-size:14px">
<strong>Done automatically:</strong><br>
Taken off the site.<br>
${repLine}<br>
${n.toldOwners.length ? `${n.toldOwners.length} other owner${n.toldOwners.length > 1 ? "s" : ""} who were considering them ${n.toldOwners.length > 1 ? "were" : "was"} told they're no longer available: ${n.toldOwners.map(escapeHtml).join(", ")}.` : "No other owners were considering them."}<br>
To put them back on the site later, set their status to Listed.</p>`;
}

// Other owners who were considering this candidate: let them know, kindly,
// that the candidate is no longer available. They owe nothing.
export async function tellOtherOwners(candidateId: string, hiringOwnerEmail: string): Promise<string[]> {
  const told: string[] = [];
  const [{ data: rows }, { data: c }] = await Promise.all([
    db()
      .from("unlocks")
      .select("*, owners(email, full_name), hires(status)")
      .eq("candidate_id", candidateId)
      .not("confirmed_at", "is", null),
    db().from("candidates").select("full_name, role_category").eq("id", candidateId).single(),
  ]);
  if (!c) return told;
  const browse = `${siteUrl()}/candidates${c.role_category ? `?role=${encodeURIComponent(c.role_category)}` : ""}`;
  type Row = { id: string; passed_at?: string | null; owners: { email: string; full_name: string | null }; hires: { status: string }[] };
  for (const r of (rows ?? []) as unknown as Row[]) {
    if (r.owners.email.toLowerCase() === hiringOwnerEmail.toLowerCase()) continue;
    if (r.hires.some((h) => h.status === "paid" || h.status === "hired")) continue;
    if (r.passed_at) continue; // they already said not a fit
    await sendEmail({ to: r.owners.email, ...ownerMail.noLongerAvailable({ name: r.owners.full_name, candidate: c.full_name, browse }) });
    await logActivity("system", "owner_told_unavailable", { candidate: refCode(candidateId), owner: r.owners.email });
    told.push(r.owners.email);
  }
  return told;
}
