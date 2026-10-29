import { db, logActivity, Owner } from "./db";
import { escapeHtml as e, sendEmail } from "./email";
import { candidate as toCand, owner as toOwner } from "./emails";
import { candidateUrl, refCode, siteUrl, teamUrl } from "./format";
import { callIcs } from "./ics";
import { repFor } from "./notify";
import { Meeting, MODE_LABEL, Reference } from "./path";
import { isOwnerEmail, signedToken } from "./session";
import { COMPANY_TZ, formatInZone } from "./time";

// Sends the emails in the path from "unlocked" to "hired". The words live in
// emails.ts; this file gathers the details and copies the rep on each step.

type Ctx = {
  unlockId: string;
  cand: { id: string; full_name: string; email: string; phone: string | null; tz: string };
  owner: Owner;
  rep: { email: string; full_name: string | null; active: boolean } | null;
};

const first = (n: string | null | undefined) => (n ?? "").split(" ")[0] || "there";
const company = (c: Ctx) => c.owner.company ?? "An employer";

// A link that opens the candidate's own page, signed in.
export function candidatePageLink(candidateId: string) {
  return `${candidateUrl()}/me/open?t=${encodeURIComponent(signedToken(`cand_${candidateId}`, 21))}`;
}

export async function pathCtx(unlockId: string): Promise<Ctx | null> {
  const { data } = await db()
    .from("unlocks")
    .select("id, candidate_id, owners(*), candidates(id, full_name, email, phone)")
    .eq("id", unlockId)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as { candidate_id: string; owners: Owner; candidates: Ctx["cand"] };
  const [{ data: call }, rep] = await Promise.all([
    db()
      .from("onboarding_calls")
      .select("candidate_time_zone")
      .eq("candidate_id", row.candidate_id)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    repFor(row.candidate_id),
  ]);
  return {
    unlockId,
    cand: { ...row.candidates, tz: call?.candidate_time_zone || COMPANY_TZ },
    owner: row.owners,
    rep: rep && rep.active && !isOwnerEmail(rep.email) ? rep : null,
  };
}

// The rep hears about every step, in one short line.
async function toRep(c: Ctx, subject: string, line: string) {
  if (!c.rep) return;
  await sendEmail({
    to: c.rep.email,
    audience: "team",
    subject,
    html: `<p style="margin:0 0 14px">${line}</p><p style="margin:0"><a href="${teamUrl()}/admin/candidates/${c.cand.id}" style="color:#17213a;font-weight:bold">Open ${e(c.cand.full_name)}'s profile</a></p>`,
  });
}

function howLine(m: Meeting, c: Ctx, forCandidate: boolean) {
  if (m.mode === "phone")
    return forCandidate
      ? `${e(c.owner.full_name ?? "They")} will call you${c.cand.phone ? ` at ${e(c.cand.phone)}` : ""}.`
      : `You call ${e(first(c.cand.full_name))}${c.cand.phone ? ` at <strong>${e(c.cand.phone)}</strong>` : ""}.`;
  if (m.mode === "video") return `Video call: <a href="${e(m.place ?? "")}" style="color:#17213a">${e(m.place ?? "")}</a>`;
  return `In person at <strong>${e(m.place ?? "")}</strong>.`;
}

// 1. A client unlocked the candidate.
export async function emailIntroStarted(unlockId: string) {
  const c = await pathCtx(unlockId);
  if (!c) return;
  await sendEmail({
    to: c.cand.email,
    ...toCand.introStarted({ name: c.cand.full_name, company: company(c), contact: c.owner.full_name, link: candidatePageLink(c.cand.id) }),
  });
  await toRep(
    c,
    `${company(c)} unlocked ${c.cand.full_name}`,
    `<strong>${e(company(c))}</strong> (${e(c.owner.full_name ?? "")}, ${e(c.owner.email)}${c.owner.phone ? `, ${e(c.owner.phone)}` : ""}) signed to meet <strong>${e(c.cand.full_name)}</strong>. A quick congratulations to ${e(first(c.cand.full_name))} goes a long way.`,
  );
}

// 2. The client offered times.
export async function emailTimesOffered(m: Meeting) {
  const c = await pathCtx(m.unlock_id);
  if (!c) return;
  await sendEmail({
    to: c.cand.email,
    ...toCand.timesOffered({ name: c.cand.full_name, company: company(c), m, times: m.slots.map((s) => formatInZone(s, c.cand.tz)), link: candidatePageLink(c.cand.id) }),
  });
  await toRep(c, `${company(c)} offered times to ${c.cand.full_name}`, `<strong>${e(company(c))}</strong> offered ${m.slots.length} times for a ${m.kind === "call" ? "first call" : "meeting"}. Waiting for ${e(first(c.cand.full_name))} to pick one.`);
}

// 3. The candidate picked a time.
export async function emailBooked(m: Meeting) {
  const c = await pathCtx(m.unlock_id);
  if (!c || !m.starts_at) return;
  const end = new Date(Date.parse(m.starts_at) + m.minutes * 60e3).toISOString();
  const label = m.kind === "call" ? "First call" : "Meeting";
  const ics = (title: string, desc: string) =>
    callIcs({ uid: `${m.id}@candidate-collection`, start: m.starts_at!, end, title, description: desc, location: m.place });
  await sendEmail({
    to: c.owner.email,
    ...toOwner.booked({ name: c.owner.full_name, candidate: c.cand.full_name, candidateId: c.cand.id, when: formatInZone(m.starts_at, m.time_zone || COMPANY_TZ), how: howLine(m, c, false), m }),
    attachments: [{ filename: `${m.kind}.ics`, content: ics(`${label}: ${c.cand.full_name}`, `${MODE_LABEL[m.mode]}. ${m.mode === "phone" ? `Call ${c.cand.full_name} at ${c.cand.phone ?? ""}` : (m.place ?? "")}\n${siteUrl()}/candidates/${c.cand.id}`) }],
  });
  await sendEmail({
    to: c.cand.email,
    ...toCand.booked({ name: c.cand.full_name, company: company(c), when: formatInZone(m.starts_at, c.cand.tz), how: howLine(m, c, true), m, link: candidatePageLink(c.cand.id) }),
    attachments: [{ filename: `${m.kind}.ics`, content: ics(`${label} with ${company(c)}`, `${MODE_LABEL[m.mode]}. ${m.mode === "phone" ? `${c.owner.full_name ?? company(c)} will call you.` : (m.place ?? "")}`) }],
  });
  await toRep(c, `Booked: ${c.cand.full_name} and ${company(c)}`, `<strong>${e(c.cand.full_name)}</strong> and <strong>${e(company(c))}</strong> have a ${label.toLowerCase()} on ${e(formatInZone(m.starts_at, COMPANY_TZ))} (${e(MODE_LABEL[m.mode].toLowerCase())}). A good-luck text to ${e(first(c.cand.full_name))} would mean a lot.`);
}

// 4. None of the times work.
export async function emailNeedOtherTimes(m: Meeting) {
  const c = await pathCtx(m.unlock_id);
  if (!c) return;
  await sendEmail({ to: c.owner.email, ...toOwner.needOtherTimes({ name: c.owner.full_name, candidate: c.cand.full_name, candidateId: c.cand.id, note: m.candidate_note, phone: c.cand.phone }) });
  await toRep(c, `${c.cand.full_name} asked for other times`, `${e(c.cand.full_name)} couldn't make ${e(company(c))}'s times.${m.candidate_note ? ` Their note: <em>${e(m.candidate_note)}</em>` : ""}`);
}

// 5. The candidate decided not to continue.
export async function emailCandidateDeclined(unlockId: string, note: string | null) {
  const c = await pathCtx(unlockId);
  if (!c) return;
  await sendEmail({ to: c.owner.email, ...toOwner.candidateDeclined({ name: c.owner.full_name, candidate: c.cand.full_name }) });
  await toRep(c, `${c.cand.full_name} passed on ${company(c)}`, `<strong>${e(c.cand.full_name)}</strong> decided not to continue with <strong>${e(company(c))}</strong>.${note ? ` Their note (only we see it): <em>${e(note)}</em>` : ""}`);
  await logActivity(`candidate:${c.cand.email}`, "candidate_declined_employer", { candidate: refCode(c.cand.id), company: c.owner.company, note });
}

// 6. After a call or meeting: how did it go?
export async function emailAskFeedback(m: Meeting) {
  const c = await pathCtx(m.unlock_id);
  if (!c) return;
  if (m.owner_verdict !== "yes") await sendEmail({ to: c.owner.email, ...toOwner.askFeedback({ name: c.owner.full_name, candidate: c.cand.full_name, candidateId: c.cand.id, m }) });
  if (!m.candidate_verdict) await sendEmail({ to: c.cand.email, ...toCand.askFeedback({ name: c.cand.full_name, company: company(c), m, link: candidatePageLink(c.cand.id) }) });
}

// 7. Someone gave feedback.
export async function emailVerdict(m: Meeting, who: "owner" | "candidate", verdict: "yes" | "no") {
  const c = await pathCtx(m.unlock_id);
  if (!c) return;
  const name = who === "owner" ? company(c) : c.cand.full_name;
  await toRep(
    c,
    `${c.cand.full_name} and ${company(c)}: ${who === "owner" ? "the client" : first(c.cand.full_name)} ${verdict === "yes" ? "wants to keep going" : "is not continuing"}`,
    `After the ${m.kind === "call" ? "first call" : "meeting"}, <strong>${e(name)}</strong> ${verdict === "yes" ? "wants to keep going" : "decided not to continue"}.`,
  );
  if (who === "candidate" && verdict === "yes") {
    await sendEmail({ to: c.owner.email, ...toOwner.candidateKeepGoing({ name: c.owner.full_name, candidate: c.cand.full_name, candidateId: c.cand.id, m }) });
  }
}

// 8. References.
export async function emailRefsRequested(unlockId: string, note: string | null) {
  const c = await pathCtx(unlockId);
  if (!c) return;
  await sendEmail({ to: c.cand.email, ...toCand.refsRequested({ name: c.cand.full_name, company: company(c), note, link: candidatePageLink(c.cand.id) }) });
  await toRep(c, `${company(c)} asked ${c.cand.full_name} for references`, `<strong>${e(company(c))}</strong> asked <strong>${e(c.cand.full_name)}</strong> for references. They're close. Help ${e(first(c.cand.full_name))} pick good ones if needed.`);
}

export async function emailRefsGiven(unlockId: string, refs: Reference[]) {
  const c = await pathCtx(unlockId);
  if (!c) return;
  await sendEmail({ to: c.owner.email, ...toOwner.references({ name: c.owner.full_name, candidate: c.cand.full_name, candidateId: c.cand.id, refs }) });
  await toRep(c, `${c.cand.full_name} sent references`, `${e(c.cand.full_name)} sent ${refs.length} reference${refs.length > 1 ? "s" : ""} to ${e(company(c))}.`);
}

// 9. The client passed: kind to the candidate, plain to the rep.
export async function emailOwnerPassed(unlockId: string, reason: string | null) {
  const c = await pathCtx(unlockId);
  if (!c) return;
  await sendEmail({ to: c.cand.email, ...toCand.ownerPassed({ name: c.cand.full_name, company: company(c), link: candidatePageLink(c.cand.id) }) });
  await toRep(c, `${company(c)} passed on ${c.cand.full_name}`, `<strong>${e(company(c))}</strong> passed on <strong>${e(c.cand.full_name)}</strong>. Why: ${reason ? e(reason) : "no reason given"}. A kind check-in with ${e(first(c.cand.full_name))} would mean a lot.`);
}

// Nudges (sent once each by the daily check).
export async function nudgeOwnerToStart(unlockId: string) {
  const c = await pathCtx(unlockId);
  if (!c) return;
  await sendEmail({ to: c.owner.email, ...toOwner.startNudge({ name: c.owner.full_name, candidate: c.cand.full_name, candidateId: c.cand.id, phone: c.cand.phone }) });
}

export async function nudgeCandidateToPick(m: Meeting) {
  const c = await pathCtx(m.unlock_id);
  if (!c) return;
  await sendEmail({ to: c.cand.email, ...toCand.pickNudge({ name: c.cand.full_name, company: company(c), m, link: candidatePageLink(c.cand.id) }) });
  await toRep(c, `Nudge: ${c.cand.full_name} hasn't picked a time`, `${e(c.cand.full_name)} hasn't answered ${e(company(c))}'s times yet. We sent a reminder; a quick call from you may help.`);
}

export async function nudgeOwnerFeedback(m: Meeting) {
  const c = await pathCtx(m.unlock_id);
  if (!c) return;
  await sendEmail({ to: c.owner.email, ...toOwner.feedbackNudge({ name: c.owner.full_name, candidate: c.cand.full_name, candidateId: c.cand.id, m }) });
}

export async function nudgeCandidateRefs(unlockId: string) {
  const c = await pathCtx(unlockId);
  if (!c) return;
  await sendEmail({ to: c.cand.email, ...toCand.refsNudge({ name: c.cand.full_name, company: company(c), link: candidatePageLink(c.cand.id) }) });
}
