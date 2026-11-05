import { db, logActivity } from "./db";
import { emailAdmin, escapeHtml, sendEmail } from "./email";
import { brandName, candidateUrl, teamUrl } from "./format";
import { candidate as candMail } from "./emails";
import { callIcs } from "./ics";
import { signedToken } from "./session";
import { strengthsLink } from "./strengthsLink";
import { repsFreeAt } from "./slots";
import { COMPANY_TZ, formatInZone, validTimeZone } from "./time";
import { newRecordedMeeting } from "./googleCalls";

export type BookResult = { ok: true; callId: string; manageToken: string } | { ok: false; error: string };

export function manageLink(callId: string) {
  return `${candidateUrl()}/call/${signedToken(`call_${callId}`, 60)}`;
}

export async function bookCall(candidateId: string, startIso: string, candidateTz: string): Promise<BookResult> {
  const tz = validTimeZone(candidateTz);
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return { ok: false, error: "Pick a time from the list." };
  const { data: cand } = await db().from("candidates").select("added_by").eq("id", candidateId).maybeSingle();
  const reps = await repsFreeAt(start.toISOString(), cand?.added_by ?? null);
  if (!reps.length) return { ok: false, error: "That time was just taken. Pick another one." };

  // Try the least-busy rep first; the database refuses a double booking.
  let callId: string | null = null;
  let repId: string | null = null;
  for (const { id: r, minutes } of reps) {
    const end = new Date(start.getTime() + minutes * 60e3);
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

  // Its own Google Meet room that records and takes notes, if Google is connected.
  try {
    const { data: rep } = await db().from("staff").select("id, email").eq("id", repId).maybeSingle();
    const { callEmailFor } = await import("./callAccounts");
    const meet = await newRecordedMeeting(rep ? await callEmailFor(rep) : null);
    if (meet) await db().from("onboarding_calls").update({ meet_link: meet.link, meet_space: meet.space }).eq("id", callId);
    if (meet?.cohost && !meet.cohost.ok) await logActivity("system", "meet_cohost_failed", { call_id: callId, error: meet.cohost.error });
  } catch (e) {
    console.error("could not make a Meet room", e);
    await logActivity("system", "meet_room_failed", { call_id: callId, error: (e as Error).message.slice(0, 300) });
  }

  // No rep chosen yet? Whoever hosts their call becomes their rep, so nobody floats.
  if (!cand?.added_by) await db().from("candidates").update({ added_by: repId }).eq("id", candidateId).is("added_by", null);

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
  meet_link?: string | null;
  candidates: { id: string; full_name: string; email: string; phone: string | null; application: Record<string, string> };
  staff: { full_name: string | null; email: string; meeting_link: string | null; time_zone: string | null };
};

export async function getCall(callId: string): Promise<CallRow | null> {
  const { data } = await db()
    .from("onboarding_calls")
    .select(
      "*, candidates(id, full_name, email, phone, application), staff(full_name, email, meeting_link, time_zone)",
    )
    .eq("id", callId)
    .maybeSingle();
  return (data as unknown as CallRow) ?? null;
}

// handedOver: the same call, same time, now with a different rep.
// tellCandidate: false moves it quietly; only the team is emailed.
export async function sendBookingEmails(callId: string, cancelled: boolean, handedOver = false, tellCandidate = true) {
  const call = await getCall(callId);
  if (!call) return;
  const c = call.candidates;
  const rep = call.staff;
  const repFirst = (rep.full_name || "our team").split(" ")[0];
  // The call's own recorded Meet room, if there is one; otherwise the rep's own link.
  const recorded = !!call.meet_link;
  const link = call.meet_link || rep.meeting_link;
  const whenCandidate = formatInZone(call.starts_at, call.candidate_time_zone ?? COMPANY_TZ);
  const whenRep = formatInZone(call.starts_at, rep.time_zone ?? COMPANY_TZ);
  const manage = manageLink(call.id);
  const { callEmailFor } = await import("./callAccounts");
  const callEmail = await callEmailFor({ id: (call as unknown as { staff_id: string }).staff_id, email: rep.email });

  const ics = (forRep: boolean) =>
    callIcs({
      uid: `${call.id}@hiring-platform`,
      start: call.starts_at,
      end: call.ends_at,
      title: forRep ? `Onboarding call: ${c.full_name}` : `Career call with ${repFirst} (${brandName()})`,
      description: forRep
        ? `${c.full_name}, ${c.email}${c.phone ? `, ${c.phone}` : ""}\nLooking for: ${c.application?.looking_for || "not said"}`
        : `Your ${Math.round((Date.parse(call.ends_at) - Date.parse(call.starts_at)) / 60e3) || 45}-minute career call. Join here: ${link ?? "we'll send the link"}\nNeed to change it? ${manage}\nQuestions? Reply to the confirmation email.`,
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

  if (tellCandidate) await sendEmail({
    to: c.email,
    ...(handedOver
      ? candMail.callNewHost({ name: c.full_name, rep: rep.full_name || "our team", when: whenCandidate, link, manage })
      : candMail.onboardingBooked({ name: c.full_name, rep: rep.full_name || "our team", when: whenCandidate, link, manage, recorded, assess: strengthsLink(c.id), minutes: Math.round((Date.parse(call.ends_at) - Date.parse(call.starts_at)) / 60e3) || 45 })),
    attachments: [{ filename: "career-call.ics", content: ics(false) }],
    // Replies (like their assessment results) go straight to their rep.
    replyTo: rep.email,
  });

  const app = c.application ?? {};
  await sendEmail({
    to: rep.email,
    subject: handedOver ? `Now yours: call with ${c.full_name}, ${whenRep}` : `New onboarding call: ${c.full_name}, ${whenRep}`,
    html: `${handedOver ? `<p>The onboarding call with <strong>${escapeHtml(c.full_name)}</strong> on <strong>${escapeHtml(whenRep)}</strong> is now yours. Same time, same link: ${escapeHtml(String(c.full_name).split(" ")[0])} already has it, so just join.</p>` : `<p><strong>${escapeHtml(c.full_name)}</strong> booked a call with you for <strong>${escapeHtml(whenRep)}</strong>.</p>`}
<p>${escapeHtml(c.email)}${c.phone ? `, ${escapeHtml(c.phone)}` : ""}</p>
${app.looking_for ? `<p>Looking for: ${escapeHtml(app.looking_for)}</p>` : ""}
${app.no_resume ? `<p style="padding:10px 12px;background:#fde8e2;border-radius:8px"><strong>No resume yet.</strong> They told us they don't have one. Use the call to go through their work history; afterwards, click <strong>Make a clean version</strong> in the Resume box on their profile to build one from the call.</p>` : ""}
${link ? `<p>Video link: <a href="${escapeHtml(link)}">${escapeHtml(link)}</a>${recorded ? `<br><small>This room records and takes notes on its own, so you can focus on the candidate. <strong>Join signed in to Google as ${escapeHtml(callEmail)}</strong> (phone or computer): the recording only starts once you're in with that account.</small>` : ""}</p>` : `<p><strong>You don't have a video link saved.</strong> Add one on your My hours page, or email the candidate a link.</p>`}
<p style="padding:10px 12px;background:#fff8e1;border-radius:8px">We asked them to take our <strong>Strengths Assessment</strong> before the call. Their result lands on their profile by itself. If it isn't there a day before, we send them a friendly reminder from you.</p>
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

// Make the call's rep a co-host of its Meet room, so the recording starts when they join.
export async function cohostForCall(callId: string): Promise<{ ok: boolean; error?: string } | null> {
  const { data: k } = await db().from("onboarding_calls").select("id, meet_space, staff(id, email)").eq("id", callId).maybeSingle();
  const staff = k?.staff as { id?: string; email?: string } | null;
  if (!k?.meet_space || !staff?.id || !staff.email) return null;
  const { callEmailFor } = await import("./callAccounts");
  const email = await callEmailFor({ id: staff.id, email: staff.email });
  const { addCohost } = await import("./googleCalls");
  const r = await addCohost(k.meet_space, email).catch((e) => ({ ok: false, error: (e as Error).message }));
  if (!r.ok) await logActivity("system", "meet_cohost_failed", { call_id: callId, error: r.error });
  return r;
}

// The rep marked a call as a no-show: send the candidate a kind note with a link to rebook.
export async function sendMissedCallEmail(callId: string) {
  const call = await getCall(callId);
  if (!call) return;
  const c = call.candidates;
  const tz = call.candidate_time_zone ?? COMPANY_TZ;
  const clock = formatInZone(call.starts_at, tz, { weekday: undefined, month: undefined, day: undefined, timeZoneName: undefined });
  const day = (ms: string | number) => formatInZone(ms, tz, { hour: undefined, minute: undefined, timeZoneName: undefined });
  // "today at 10:30 AM", or "on Monday at 10:30 AM" if they're marked a day later.
  const time = day(call.starts_at) === day(Date.now()) ? `today at ${clock}` : `on ${formatInZone(call.starts_at, tz, { month: undefined, day: undefined, hour: undefined, minute: undefined, timeZoneName: undefined })} at ${clock}`;
  await sendEmail({
    to: c.email,
    ...candMail.missedCall({
      name: c.full_name,
      time,
      rep: call.staff.full_name || "our team",
      rebook: `${candidateUrl()}/apply/book?c=${encodeURIComponent(signedToken(`cand_${c.id}`, 30))}`,
    }),
    replyTo: call.staff.email,
  });
  await logActivity("system", "missed_call_email", { call_id: callId, candidate_id: c.id });
}

// About an hour before each call: remind the candidate, with "Yes, I'll be there". Once per call.
export async function sendHourReminders() {
  const now = Date.now();
  const { data } = await db()
    .from("onboarding_calls")
    .select("id")
    .eq("status", "booked")
    .gte("starts_at", new Date(now + 40 * 60e3).toISOString())
    .lte("starts_at", new Date(now + 75 * 60e3).toISOString());
  let sent = 0;
  for (const { id } of (data ?? []) as { id: string }[]) {
    const { count } = await db().from("activity_log").select("id", { count: "exact", head: true }).eq("action", "call_hour_reminder").eq("details->>call_id", id);
    if (count) continue;
    const call = await getCall(id);
    if (!call) continue;
    const token = signedToken(`call_${id}`, 60);
    const tz = call.candidate_time_zone ?? COMPANY_TZ;
    const clock = formatInZone(call.starts_at, tz, { weekday: undefined, month: undefined, day: undefined, timeZoneName: undefined });
    await logActivity("system", "call_hour_reminder", { call_id: id });
    await sendEmail({
      to: call.candidates.email,
      ...candMail.hourReminder({
        name: call.candidates.full_name,
        rep: call.staff.full_name || "our team",
        when: `Today at ${clock}`,
        confirm: `${candidateUrl()}/call/${token}/confirm`,
        join: call.meet_link || call.staff.meeting_link,
        manage: `${candidateUrl()}/call/${token}`,
      }),
      replyTo: call.staff.email,
    });
    sent++;
  }
  return { sent };
}

// Calls the candidate confirmed from their reminder.
export async function confirmedCallIds(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const { data } = await db().from("activity_log").select("details").eq("action", "call_confirmed").gte("at", new Date(Date.now() - 3 * 864e5).toISOString());
  const want = new Set(ids);
  return new Set(((data ?? []) as { details: { call_id?: string } }[]).map((r) => r.details?.call_id ?? "").filter((x) => want.has(x)));
}

// Moves a booked call to another rep, quietly for the candidate (same link): the new
// rep gets the booking with the recorded link and is made co-host; the old rep is told.
export async function takeOverCall(callId: string, toStaffId: string) {
  const { db } = await import("./db");
  const { sendEmail, escapeHtml } = await import("./email");
  const { data: k } = await db().from("onboarding_calls").select("id, staff_id, starts_at, candidates(full_name), staff(email)").eq("id", callId).maybeSingle();
  if (!k || k.staff_id === toStaffId) return false;
  const { data: to } = await db().from("staff").select("email, full_name").eq("id", toStaffId).maybeSingle();
  await db().from("onboarding_calls").update({ staff_id: toStaffId }).eq("id", callId);
  await cohostForCall(callId).catch(() => null);
  await sendBookingEmails(callId, false, true, false);
  const was = (k.staff as unknown as { email: string } | null)?.email;
  const name = (k.candidates as unknown as { full_name: string } | null)?.full_name ?? "your candidate";
  if (was && to && was.toLowerCase() !== to.email.toLowerCase())
    await sendEmail({
      to: was,
      subject: `Your call with ${name} moved to ${to.full_name || "another rep"}`,
      html: `<p>The onboarding call with <strong>${escapeHtml(name)}</strong> on ${escapeHtml(new Date(k.starts_at).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" }))} now belongs to ${escapeHtml(to.full_name || to.email)}. They have the link. You can remove it from your calendar.</p>`,
    }).catch(() => null);
  return true;
}

// Other booked calls for the same candidate around the same time are duplicates:
// close them quietly (no emails), so there's always one call, one link.
export async function closeDuplicateCalls(keepId: string) {
  const { db } = await import("./db");
  const { data: k } = await db().from("onboarding_calls").select("candidate_id, starts_at").eq("id", keepId).maybeSingle();
  if (!k) return 0;
  const t = Date.parse(k.starts_at);
  const { data: dups } = await db()
    .from("onboarding_calls")
    .select("id, starts_at")
    .eq("candidate_id", k.candidate_id)
    .eq("status", "booked")
    .neq("id", keepId);
  const close = ((dups ?? []) as { id: string; starts_at: string }[]).filter((d) => Math.abs(Date.parse(d.starts_at) - t) < 3 * 3600e3);
  for (const d of close) await db().from("onboarding_calls").update({ status: "cancelled" }).eq("id", d.id);
  return close.length;
}
