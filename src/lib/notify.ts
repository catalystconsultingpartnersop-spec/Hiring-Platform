import { db, logActivity } from "./db";
import { escapeHtml, sendEmail } from "./email";
import { isOwnerEmail } from "./session";
import { money, refCode, siteUrl } from "./format";
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

// A candidate was hired: take them off the catalog and tell their rep.
export async function candidateHired(
  candidateId: string,
  owner: { email: string; full_name: string | null; company: string | null; phone?: string | null },
  amountCents: number,
  details: HireDetails,
) {
  await db()
    .from("candidates")
    .update({ status: "hired", updated_at: new Date().toISOString() })
    .eq("id", candidateId)
    .in("status", ["listed", "paused", "draft"]);
  await logActivity("system", "candidate_marked_hired", { candidate: refCode(candidateId) });

  const rep = await repFor(candidateId);
  if (!rep || !rep.active || isOwnerEmail(rep.email)) return rep; // Heshy already gets the payment email
  const { data: c } = await db().from("candidates").select("full_name, email, phone").eq("id", candidateId).single();
  if (!c) return rep;
  const first = (rep.full_name ?? "").split(" ")[0] || "there";
  await sendEmail({
    to: rep.email,
    subject: `${c.full_name} is being hired by ${owner.company}`,
    html: `<p>Hi ${escapeHtml(first)},</p>
<p>Good news: <strong>${escapeHtml(owner.company ?? "")}</strong> has decided to hire <strong>${escapeHtml(c.full_name)}</strong> (${refCode(candidateId)}) and paid the ${money(amountCents)} fee. ${escapeHtml(c.full_name.split(" ")[0])} is now off the catalog.</p>
<table style="border-collapse:collapse;font-size:14px">
<tr><td style="padding:4px 14px 4px 0;color:#4a5570">Employer</td><td>${escapeHtml(owner.company ?? "")}, ${escapeHtml(owner.full_name ?? "")}, ${escapeHtml(owner.email)}${owner.phone ? `, ${escapeHtml(owner.phone)}` : ""}</td></tr>
${details.jobTitle ? `<tr><td style="padding:4px 14px 4px 0;color:#4a5570">Role</td><td>${escapeHtml(details.jobTitle)}</td></tr>` : ""}
${details.startDate ? `<tr><td style="padding:4px 14px 4px 0;color:#4a5570">Expected start</td><td>${escapeHtml(details.startDate)}</td></tr>` : ""}
<tr><td style="padding:4px 14px 4px 0;color:#4a5570">Candidate</td><td>${escapeHtml(c.email)}${c.phone ? `, ${escapeHtml(c.phone)}` : ""}</td></tr>
</table>
<p><strong>Please check in with ${escapeHtml(c.full_name.split(" ")[0])}</strong> in the next day or two: congratulate them, make sure the offer arrived, and let us know if anything looks off.</p>
<p><a href="${siteUrl()}/admin/candidates/${candidateId}">Open their profile</a></p>`,
  });
  await logActivity("system", "rep_notified_of_hire", { candidate: refCode(candidateId), rep: rep.email });
  return rep;
}
