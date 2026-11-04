import { db, logActivity } from "./db";
import { strengthsLink } from "./strengthsLink";
import { escapeHtml, sendEmail } from "./email";
import { candidate as candMail } from "./emails";
import { candidateUrl, teamUrl } from "./format";
import { signedToken } from "./session";
import { COMPANY_TZ, formatInZone } from "./time";

const HOUR = 36e5;

type Row = {
  id: string;
  starts_at: string;
  candidate_time_zone: string | null;
  meet_link: string | null;
  candidates: { id: string; full_name: string; email: string; working_genius: string | null; assessment_path: string | null };
  staff: { email: string; full_name: string | null; time_zone: string | null; active: boolean; meeting_link: string | null };
};

// Runs with the daily job. For every onboarding call in the next day or so: a reminder
// to the candidate from their rep (with the assessment if they haven't taken it), and a
// heads-up to the rep saying whether the results are in.
// Each call gets this once.
export async function beforeCallNudges() {
  const sent = { candidates: 0, reps: 0 };
  const now = Date.now();
  const { data } = await db()
    .from("onboarding_calls")
    .select("id, starts_at, candidate_time_zone, meet_link, candidates(id, full_name, email, working_genius, assessment_path), staff(email, full_name, time_zone, active, meeting_link)")
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

      // Every candidate: the time, one tap to confirm, the assessment only if it's missing.
      {
        const tz = call.candidate_time_zone ?? COMPANY_TZ;
        const day = (ms: number) => new Date(ms).toLocaleDateString("en-US", { timeZone: tz });
        const today = day(Date.now()) === day(Date.parse(call.starts_at));
        const clock = formatInZone(call.starts_at, tz, { weekday: undefined, month: undefined, day: undefined });
        const token = signedToken(`call_${call.id}`, 60);
        await sendEmail({
          to: c.email,
          ...candMail.dayBefore({
            name: c.full_name,
            rep: repName ?? "our team",
            when: `${today ? "Today" : "Tomorrow"} at ${clock}`,
            confirm: `${candidateUrl()}/call/${token}/confirm`,
            join: call.meet_link || rep.meeting_link,
            manage: `${candidateUrl()}/call/${token}`,
            assess: hasResults ? null : strengthsLink(c.id),
          }),
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
<p>${hasResults ? "Their Strengths Assessment result is in. Take a look before you talk." : "Their Strengths Assessment result isn't in yet. We've sent them a friendly reminder from you."}</p>
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
