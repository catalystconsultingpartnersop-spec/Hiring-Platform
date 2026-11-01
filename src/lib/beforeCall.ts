import { db, logActivity } from "./db";
import { escapeHtml, sendEmail } from "./email";
import { candidate as candMail } from "./emails";
import { teamUrl } from "./format";
import { COMPANY_TZ, formatInZone } from "./time";

const HOUR = 36e5;

type Row = {
  id: string;
  starts_at: string;
  candidate_time_zone: string | null;
  candidates: { id: string; full_name: string; email: string; working_genius: string | null; assessment_path: string | null };
  staff: { email: string; full_name: string | null; time_zone: string | null; active: boolean };
};

// Runs with the daily job. For every onboarding call in the next day or so:
// if the candidate hasn't sent their assessment results, a friendly reminder
// from their rep; and the rep gets a heads-up saying whether the results are in.
// Each call gets this once.
export async function beforeCallNudges() {
  const sent = { candidates: 0, reps: 0 };
  const now = Date.now();
  const { data } = await db()
    .from("onboarding_calls")
    .select("id, starts_at, candidate_time_zone, candidates(id, full_name, email, working_genius, assessment_path), staff(email, full_name, time_zone, active)")
    .eq("status", "booked")
    .gte("starts_at", new Date(now + 6 * HOUR).toISOString())
    .lte("starts_at", new Date(now + 40 * HOUR).toISOString());
  for (const call of (data ?? []) as unknown as Row[]) {
    try {
      const { count } = await db()
        .from("activity_log")
        .select("id", { count: "exact", head: true })
        .eq("action", "before_call")
        .eq("details->>call", call.id);
      if (count) continue;
      const c = call.candidates;
      const rep = call.staff;
      const hasResults = !!(c.assessment_path || c.working_genius);
      const repName = rep.active ? rep.full_name : null;

      if (!hasResults) {
        const when = formatInZone(call.starts_at, call.candidate_time_zone ?? COMPANY_TZ);
        await sendEmail({
          to: c.email,
          ...candMail.reminder({ kind: "assessment", name: c.full_name, rep: repName, callSoon: when }),
          replyTo: rep.active ? rep.email : undefined,
          fromName: repName ?? undefined,
        });
        sent.candidates++;
      }
      if (rep.active) {
        const whenRep = formatInZone(call.starts_at, rep.time_zone ?? COMPANY_TZ);
        await sendEmail({
          to: rep.email,
          subject: `Coming up: your call with ${c.full_name}, ${whenRep}`,
          html: `<p>Hi ${escapeHtml((rep.full_name ?? "").split(" ")[0] || "there")},</p>
<p>You have an onboarding call with <strong>${escapeHtml(c.full_name)}</strong> ${escapeHtml(whenRep)}.</p>
<p>${hasResults ? "Their Working Genius results are in. Take a look before you talk." : "Their Working Genius results aren't in yet. We've sent them a friendly reminder from you."}</p>
<p><a href="${teamUrl()}/admin/candidates/${c.id}">Open their profile</a></p>`,
          replyTo: c.email,
        });
        sent.reps++;
      }
      await logActivity("system", "before_call", { call: call.id, results: hasResults });
    } catch (e) {
      console.error("before-call nudge failed", call.id, e);
    }
  }
  return sent;
}
