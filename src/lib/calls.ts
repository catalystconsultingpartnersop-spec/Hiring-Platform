import { db, logActivity } from "./db";
import { emailAdmin, escapeHtml, sendEmail } from "./email";
import { brandName, candidateUrl, teamUrl } from "./format";
import { candidate as candMail } from "./emails";
import { callIcs } from "./ics";
import { signedToken } from "./session";
import { CALL_MINUTES, repsFreeAt } from "./slots";
import { COMPANY_TZ, formatInZone, validTimeZone } from "./time";

export type BookResult = { ok: true; callId: string; manageToken: string } | { ok: false; error: string };

export function manageLink(callId: string) {
  return `${candidateUrl()}/call/${signedToken(`call_${callId}`, 60)}`;
}

export async function bookCall(candidateId: string, startIso: string, candidateTz: string): Promise<BookResult> {
  const tz = validTimeZone(candidateTz);
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return { ok: false, error: "Pick a time from the list." };
  const end = new Date(start.getTime() + CALL_MINUTES * 60e3);

  const reps = await repsFreeAt(start.toISOString());
  if (!reps.length) return { ok: false, error: "That time was just taken. Pick another one." };

  // Try the least-busy rep first; the database refuses a double booking.
  let callId: string | null = null;
  let repId: string | null = null;
  for (const r of reps) {
    const { data, error } = await db()
      .from("onboarding_calls")
      .insert({
        candidate_id: candidateId,
        staff_id: r,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        candidate_time_zone: tz,
      })
      .select("id")
      .single();
    if (!error && data) {
      callId = data.id;
      repId = r;
      break;
    }
  }
  if (!callId || !repId) return { ok: false, error: "That time was just taken. Pick another one." };

  await sendBookingEmails(callId, false);
  await logActivity("system", "onboarding_call_booked", { call_id: callId, candidate_id: candidateId, staff_id: repId });
  return { ok: true, callId, manageToken: signedToken(`call_${callId}`, 60) };
}

type CallRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  candidate_time_zone: string | null;
  candidates: { id: string; full_name: string; email: string; phone: string | null; application: Record<string, string> };
  staff: { full_name: string | null; email: string; meeting_link: string | null; time_zone: string | null };
};

export async function getCall(callId: string): Promise<CallRow | null> {
  const { data } = await db()
    .from("onboarding_calls")
    .select(
      "id, starts_at, ends_at, status, candidate_time_zone, candidates(id, full_name, email, phone, application), staff(full_name, email, meeting_link, time_zone)",
    )
    .eq("id", callId)
    .maybeSingle();
  return (data as unknown as CallRow) ?? null;
}

export async function sendBookingEmails(callId: string, cancelled: boolean) {
  const call = await getCall(callId);
  if (!call) return;
  const c = call.candidates;
  const rep = call.staff;
  const repFirst = (rep.full_name || "our team").split(" ")[0];
  const link = rep.meeting_link;
  const whenCandidate = formatInZone(call.starts_at, call.candidate_time_zone ?? COMPANY_TZ);
  const whenRep = formatInZone(call.starts_at, rep.time_zone ?? COMPANY_TZ);
  const manage = manageLink(call.id);

  const ics = (forRep: boolean) =>
    callIcs({
      uid: `${call.id}@hiring-platform`,
      start: call.starts_at,
      end: call.ends_at,
      title: forRep ? `Onboarding call: ${c.full_name}` : `Career call with ${repFirst} (${brandName()})`,
      description: forRep
        ? `${c.full_name}, ${c.email}${c.phone ? `, ${c.phone}` : ""}\nLooking for: ${c.application?.looking_for || "not said"}`
        : `Your 45-minute career call. Join here: ${link ?? "we'll send the link"}\nNeed to change it? ${manage}\nQuestions? Reply to the confirmation email.`,
      location: link,
      cancelled,
    });

  if (cancelled) {
    await sendEmail({
      to: c.email,
      ...candMail.onboardingCancelled({
        name: c.full_name,
        when: whenCandidate,
        rebook: `${candidateUrl()}/apply/book?c=${encodeURIComponent(signedToken(`cand_${c.id}`, 30))}`,
      }),
      attachments: [{ filename: "cancelled.ics", content: ics(false) }],
    });
    await sendEmail({
      to: rep.email,
      subject: `Cancelled: onboarding call with ${c.full_name}`,
      html: `<p>The call with <strong>${escapeHtml(c.full_name)}</strong> on ${escapeHtml(whenRep)} was cancelled.</p>`,
      attachments: [{ filename: "cancelled.ics", content: ics(true) }],
    });
    return;
  }

  await sendEmail({
    to: c.email,
    ...candMail.onboardingBooked({ name: c.full_name, rep: rep.full_name || "our team", when: whenCandidate, link, manage }),
    attachments: [{ filename: "career-call.ics", content: ics(false) }],
  });

  const app = c.application ?? {};
  await sendEmail({
    to: rep.email,
    subject: `New onboarding call: ${c.full_name}, ${whenRep}`,
    html: `<p><strong>${escapeHtml(c.full_name)}</strong> booked a call with you for <strong>${escapeHtml(whenRep)}</strong>.</p>
<p>${escapeHtml(c.email)}${c.phone ? `, ${escapeHtml(c.phone)}` : ""}</p>
${app.looking_for ? `<p>Looking for: ${escapeHtml(app.looking_for)}</p>` : ""}
${link ? `<p>Your video link: <a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>` : `<p><strong>You don't have a video link saved.</strong> Add one on your My hours page, or email the candidate a link.</p>`}
<p><a href="${teamUrl()}/admin/candidates/${c.id}">Open their profile</a> · <a href="${teamUrl()}/admin/calls">All your calls</a></p>`,
    attachments: [{ filename: "onboarding-call.ics", content: ics(true) }],
  });
  await emailAdmin(
    `Booked: ${c.full_name} with ${rep.full_name || rep.email}`,
    `<p>${escapeHtml(c.full_name)} booked an onboarding call with ${escapeHtml(rep.full_name || rep.email)} for ${escapeHtml(formatInZone(call.starts_at, COMPANY_TZ))}.</p>`,
  );
}

export async function cancelCall(callId: string, actor: string) {
  const { data } = await db()
    .from("onboarding_calls")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", callId)
    .eq("status", "booked")
    .select("id")
    .maybeSingle();
  if (!data) return false;
  await sendBookingEmails(callId, true);
  await logActivity(actor, "onboarding_call_cancelled", { call_id: callId });
  return true;
}
