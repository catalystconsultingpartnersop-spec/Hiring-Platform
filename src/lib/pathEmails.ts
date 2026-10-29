import { db, logActivity, Owner } from "./db";
import { escapeHtml as e, sendEmail } from "./email";
import { brandName, candidateUrl, contactPhone, refCode, siteUrl, teamUrl } from "./format";
import { callIcs } from "./ics";
import { repFor } from "./notify";
import { Meeting, MODE_LABEL, Reference } from "./path";
import { isOwnerEmail, signedToken } from "./session";
import { COMPANY_TZ, formatInZone } from "./time";

// Every email in the path from "unlocked" to "hired". The rep is copied on
// each step so they can help, and nobody is ever stuck waiting without a nudge.

type Ctx = {
  unlockId: string;
  cand: { id: string; full_name: string; email: string; phone: string | null; tz: string };
  owner: Owner;
  rep: { email: string; full_name: string | null; active: boolean } | null;
};

const first = (n: string | null | undefined) => (n ?? "").split(" ")[0] || "there";
const btn = (href: string, label: string) =>
  `<p style="margin:18px 0"><a href="${href}" style="display:inline-block;background:#f2b300;color:#17213a;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">${e(label)}</a></p>`;
const sign = () => `<p>${e(brandName())}<br><span style="color:#4a5570">Questions? Text or call ${e(contactPhone())}, or just reply.</span></p>`;

// A link that opens the candidate's own page, signed in.
export function candidatePageLink(candidateId: string) {
  return `${candidateUrl()}/me/open?t=${encodeURIComponent(signedToken(`cand_${candidateId}`, 21))}`;
}
const ownerLink = (candidateId: string) => `${siteUrl()}/candidates/${candidateId}#next`;

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

async function toRep(c: Ctx, subject: string, html: string, attachments?: { filename: string; content: Buffer }[]) {
  if (!c.rep) return;
  await sendEmail({
    to: c.rep.email,
    subject,
    html: `${html}<p><a href="${teamUrl()}/admin/candidates/${c.cand.id}">Open ${e(c.cand.full_name)}'s profile</a></p>`,
    attachments,
  });
}

const what = (m: Meeting) => (m.kind === "call" ? "a first call" : "a meeting");
const whatShort = (m: Meeting) => (m.kind === "call" ? "first call" : "meeting");
function howLine(m: Meeting, c: Ctx, forCandidate: boolean) {
  if (m.mode === "phone")
    return forCandidate
      ? `${e(c.owner.full_name ?? "They")} will call you${c.cand.phone ? ` at ${e(c.cand.phone)}` : ""}.`
      : `You call ${e(first(c.cand.full_name))}${c.cand.phone ? ` at <strong>${e(c.cand.phone)}</strong>` : ""}.`;
  if (m.mode === "video") return `Video call: <a href="${e(m.place ?? "")}">${e(m.place ?? "")}</a>`;
  return `In person at <strong>${e(m.place ?? "")}</strong>.`;
}

// 1. A client unlocked the candidate.
export async function emailIntroStarted(unlockId: string) {
  const c = await pathCtx(unlockId);
  if (!c) return;
  const co = c.owner.company ?? "An employer";
  await sendEmail({
    to: c.cand.email,
    subject: `Good news: ${co} would like to meet you`,
    html: `<p>Hi ${e(first(c.cand.full_name))},</p>
<p><strong>${e(co)}</strong>${c.owner.full_name ? ` (${e(c.owner.full_name)})` : ""} read your profile and would like to meet you.</p>
<p>They'll suggest a few times for a short first call, and we'll email you as soon as they do. You can see everything, and say yes or no, on your page.</p>
${btn(candidatePageLink(c.cand.id), "See your page")}
${sign()}`,
  });
  await toRep(
    c,
    `${co} unlocked ${c.cand.full_name}`,
    `<p><strong>${e(co)}</strong> (${e(c.owner.full_name ?? "")}, ${e(c.owner.email)}${c.owner.phone ? `, ${e(c.owner.phone)}` : ""}) signed to meet <strong>${e(c.cand.full_name)}</strong> (${refCode(c.cand.id)}).</p>
<p>They'll offer times for a first call next. A quick note to ${e(first(c.cand.full_name))} wouldn't hurt: congratulations, and here's who they are.</p>`,
  );
}

// 2. The client offered times.
export async function emailTimesOffered(m: Meeting) {
  const c = await pathCtx(m.unlock_id);
  if (!c) return;
  const co = c.owner.company ?? "The employer";
  const times = m.slots.map((s) => `<li>${e(formatInZone(s, c.cand.tz))}</li>`).join("");
  await sendEmail({
    to: c.cand.email,
    subject: `${co} suggested times for ${what(m)}`,
    html: `<p>Hi ${e(first(c.cand.full_name))},</p>
<p><strong>${e(co)}</strong> would like to set up ${what(m)} (${m.minutes} minutes, ${e(MODE_LABEL[m.mode].toLowerCase())}). Here are the times they offered:</p>
<ul>${times}</ul>
${m.note ? `<p>Their note: <em>${e(m.note)}</em></p>` : ""}
${btn(candidatePageLink(c.cand.id), "Pick a time")}
<p>None of these work? You can say so on the same page, and they'll offer new times.</p>
${sign()}`,
  });
  await toRep(c, `${co} offered times to ${c.cand.full_name}`, `<p><strong>${e(co)}</strong> offered ${m.slots.length} times for ${what(m)} with <strong>${e(c.cand.full_name)}</strong>. Waiting for ${e(first(c.cand.full_name))} to pick one.</p>`);
}

// 3. The candidate picked a time.
export async function emailBooked(m: Meeting) {
  const c = await pathCtx(m.unlock_id);
  if (!c || !m.starts_at) return;
  const co = c.owner.company ?? "the employer";
  const end = new Date(Date.parse(m.starts_at) + m.minutes * 60e3).toISOString();
  const ics = (title: string, desc: string) =>
    callIcs({ uid: `${m.id}@candidate-collection`, start: m.starts_at!, end, title, description: desc, location: m.place });
  const whenOwner = formatInZone(m.starts_at, m.time_zone || COMPANY_TZ);
  const whenCand = formatInZone(m.starts_at, c.cand.tz);
  const candFirst = first(c.cand.full_name);

  await sendEmail({
    to: c.owner.email,
    subject: `Booked: ${whatShort(m)} with ${c.cand.full_name}, ${whenOwner}`,
    html: `<p>Hi ${e(first(c.owner.full_name))},</p>
<p><strong>${e(c.cand.full_name)}</strong> picked a time for your ${whatShort(m)}:</p>
<p style="font-size:18px"><strong>${e(whenOwner)}</strong></p>
<p>${howLine(m, c, false)}</p>
${m.kind === "call" ? `<p><strong>A few good questions for a first call:</strong> What kind of work gives you energy? What are you looking for in your next role? What questions do you have for us?</p>` : ""}
${btn(ownerLink(c.cand.id), `Open ${candFirst}'s page`)}
${sign()}`,
    attachments: [
      { filename: `${m.kind}.ics`, content: ics(`${m.kind === "call" ? "First call" : "Meeting"}: ${c.cand.full_name}`, `${MODE_LABEL[m.mode]}. ${m.mode === "phone" ? `Call ${c.cand.full_name} at ${c.cand.phone ?? ""}` : (m.place ?? "")}\n${ownerLink(c.cand.id)}`) },
    ],
  });
  await sendEmail({
    to: c.cand.email,
    subject: `You're booked with ${co}: ${whenCand}`,
    html: `<p>Hi ${e(candFirst)},</p>
<p>You're all set for your ${whatShort(m)} with <strong>${e(co)}</strong>${c.owner.full_name ? ` (${e(c.owner.full_name)})` : ""}:</p>
<p style="font-size:18px"><strong>${e(whenCand)}</strong></p>
<p>${howLine(m, c, true)}</p>
<p>Be yourself, and talk about the kind of work you enjoy. That's what makes a great match. Our guide <a href="${candidateUrl()}/join/help/get-ready-for-an-interview">Getting ready for an interview</a> takes 4 minutes.</p>
${btn(candidatePageLink(c.cand.id), "See your page")}
${sign()}`,
    attachments: [
      { filename: `${m.kind}.ics`, content: ics(`${m.kind === "call" ? "Call" : "Meeting"} with ${co}`, `${MODE_LABEL[m.mode]}. ${m.mode === "phone" ? `${c.owner.full_name ?? co} will call you.` : (m.place ?? "")}`) },
    ],
  });
  await toRep(c, `Booked: ${c.cand.full_name} and ${co}, ${formatInZone(m.starts_at, COMPANY_TZ)}`, `<p><strong>${e(c.cand.full_name)}</strong> and <strong>${e(co)}</strong> have a ${whatShort(m)} on ${e(formatInZone(m.starts_at, COMPANY_TZ))} (${e(MODE_LABEL[m.mode].toLowerCase())}). Good moment for a quick good-luck text to ${e(candFirst)}.</p>`);
}

// 4. None of the times work for the candidate.
export async function emailNeedOtherTimes(m: Meeting) {
  const c = await pathCtx(m.unlock_id);
  if (!c) return;
  const candFirst = first(c.cand.full_name);
  await sendEmail({
    to: c.owner.email,
    subject: `${c.cand.full_name} needs different times`,
    html: `<p>Hi ${e(first(c.owner.full_name))},</p>
<p>${e(candFirst)} would love to talk, but those times don't work.${m.candidate_note ? ` Their note: <em>${e(m.candidate_note)}</em>` : ""}</p>
${btn(ownerLink(c.cand.id), "Offer new times")}
<p>Or just give ${e(candFirst)} a call${c.cand.phone ? ` at ${e(c.cand.phone)}` : ""} to set it up.</p>
${sign()}`,
  });
  await toRep(c, `${c.cand.full_name} asked for other times`, `<p>${e(c.cand.full_name)} couldn't make the times ${e(c.owner.company ?? "the client")} offered.${m.candidate_note ? ` Note: <em>${e(m.candidate_note)}</em>` : ""}</p>`);
}

// 5. The candidate decided not to continue.
export async function emailCandidateDeclined(unlockId: string, note: string | null) {
  const c = await pathCtx(unlockId);
  if (!c) return;
  const candFirst = first(c.cand.full_name);
  await sendEmail({
    to: c.owner.email,
    subject: `An update on ${c.cand.full_name}`,
    html: `<p>Hi ${e(first(c.owner.full_name))},</p>
<p>Thanks for your interest in ${e(candFirst)}. They've decided not to move forward right now, so nothing is charged and you owe nothing for ${e(candFirst)}.</p>
<p>We know that's disappointing. There are other strong people in the collection, and we're happy to point you to the best fits.</p>
${btn(`${siteUrl()}/candidates`, "See other candidates")}
${sign()}`,
  });
  await toRep(c, `${c.cand.full_name} passed on ${c.owner.company ?? "a client"}`, `<p><strong>${e(c.cand.full_name)}</strong> decided not to continue with <strong>${e(c.owner.company ?? "")}</strong>.${note ? ` Their note: <em>${e(note)}</em>` : ""}</p>`);
  await logActivity(`candidate:${c.cand.email}`, "candidate_declined_employer", { candidate: refCode(c.cand.id), company: c.owner.company, note });
}

// 6. After a call or meeting: how did it go?
export async function emailAskFeedback(m: Meeting) {
  const c = await pathCtx(m.unlock_id);
  if (!c) return;
  const candFirst = first(c.cand.full_name);
  await sendEmail({
    to: c.owner.email,
    subject: `How was your ${whatShort(m)} with ${candFirst}?`,
    html: `<p>Hi ${e(first(c.owner.full_name))},</p>
<p>How did it go with ${e(c.cand.full_name)}? One tap tells us, and we'll line up the next step${m.kind === "call" ? ": a proper meeting" : ": hire, meet again, or ask for references"}.</p>
${btn(ownerLink(c.cand.id), "Tell us how it went")}
${sign()}`,
  });
  await sendEmail({
    to: c.cand.email,
    subject: `How was it with ${c.owner.company ?? "the employer"}?`,
    html: `<p>Hi ${e(candFirst)},</p>
<p>How did your ${whatShort(m)} with <strong>${e(c.owner.company ?? "")}</strong> go? Let us know if you'd like to keep going. It only takes a tap, and it stays between you and us.</p>
${btn(candidatePageLink(c.cand.id), "Tell us how it went")}
${sign()}`,
  });
}

// 7. Someone gave feedback (rep always hears; the client hears good news).
export async function emailVerdict(m: Meeting, who: "owner" | "candidate", verdict: "yes" | "no") {
  const c = await pathCtx(m.unlock_id);
  if (!c) return;
  const name = who === "owner" ? (c.owner.company ?? "The client") : c.cand.full_name;
  await toRep(
    c,
    `${c.cand.full_name} & ${c.owner.company ?? "client"}: ${who === "owner" ? "the client" : first(c.cand.full_name)} ${verdict === "yes" ? "wants to keep going" : "is not continuing"}`,
    `<p>After the ${whatShort(m)}, <strong>${e(name)}</strong> ${verdict === "yes" ? "wants to keep going" : "decided not to continue"}.</p>`,
  );
  if (who === "candidate" && verdict === "yes") {
    await sendEmail({
      to: c.owner.email,
      subject: `${first(c.cand.full_name)} would like to keep going`,
      html: `<p>Hi ${e(first(c.owner.full_name))},</p>
<p>Good news: ${e(c.cand.full_name)} enjoyed the ${whatShort(m)} and would like to keep going.</p>
${btn(ownerLink(c.cand.id), "See the next step")}
${sign()}`,
    });
  }
}

// 8. References.
export async function emailRefsRequested(unlockId: string, note: string | null) {
  const c = await pathCtx(unlockId);
  if (!c) return;
  const co = c.owner.company ?? "The employer";
  await sendEmail({
    to: c.cand.email,
    subject: `${co} asked for your references`,
    html: `<p>Hi ${e(first(c.cand.full_name))},</p>
<p>Great sign: <strong>${e(co)}</strong> would like to speak with two or three people you've worked with. A former manager is best.</p>
${note ? `<p>Their note: <em>${e(note)}</em></p>` : ""}
<p>Give your references a quick heads-up that they may get a call.</p>
${btn(candidatePageLink(c.cand.id), "Add your references")}
${sign()}`,
  });
  await toRep(c, `${co} asked ${c.cand.full_name} for references`, `<p><strong>${e(co)}</strong> asked <strong>${e(c.cand.full_name)}</strong> for references. They're close: help ${e(first(c.cand.full_name))} pick good ones if needed.</p>`);
}

export async function emailRefsGiven(unlockId: string, refs: Reference[]) {
  const c = await pathCtx(unlockId);
  if (!c) return;
  const list = refs
    .map((r) => `<li><strong>${e(r.name)}</strong>${r.relation ? `, ${e(r.relation)}` : ""}<br>${[r.phone, r.email].filter(Boolean).map(e).join(" · ")}</li>`)
    .join("");
  await sendEmail({
    to: c.owner.email,
    subject: `${c.cand.full_name}'s references`,
    html: `<p>Hi ${e(first(c.owner.full_name))},</p>
<p>${e(c.cand.full_name)} sent their references:</p>
<ul>${list}</ul>
<p>Our guide <a href="${siteUrl()}/hiring-help/articles/reference-checks">Reference checks that actually tell you something</a> has the questions to ask.</p>
${btn(ownerLink(c.cand.id), "See the next step")}
${sign()}`,
  });
  await toRep(c, `${c.cand.full_name} sent references`, `<p>${e(c.cand.full_name)} sent ${refs.length} reference${refs.length > 1 ? "s" : ""} to ${e(c.owner.company ?? "the client")}.</p>`);
}

// Nudges (sent once each by the daily check).
export async function nudgeOwnerToStart(unlockId: string) {
  const c = await pathCtx(unlockId);
  if (!c) return;
  const candFirst = first(c.cand.full_name);
  await sendEmail({
    to: c.owner.email,
    subject: `Ready to talk to ${candFirst}?`,
    html: `<p>Hi ${e(first(c.owner.full_name))},</p>
<p>You unlocked ${e(c.cand.full_name)} a couple of days ago. The best candidates don't wait long. The easiest next step is a short first call: offer three times and ${e(candFirst)} picks one.</p>
${btn(ownerLink(c.cand.id), "Offer a few times")}
<p>Or just call ${e(candFirst)}${c.cand.phone ? ` at ${e(c.cand.phone)}` : ""}. Whatever's easiest.</p>
${sign()}`,
  });
}

export async function nudgeCandidateToPick(m: Meeting) {
  const c = await pathCtx(m.unlock_id);
  if (!c) return;
  await sendEmail({
    to: c.cand.email,
    subject: `Reminder: ${c.owner.company ?? "an employer"} is waiting to hear from you`,
    html: `<p>Hi ${e(first(c.cand.full_name))},</p>
<p><strong>${e(c.owner.company ?? "")}</strong> offered times for ${what(m)}. Pick one, ask for other times, or let them know it's not for you. Any answer is fine.</p>
${btn(candidatePageLink(c.cand.id), "Answer now")}
${sign()}`,
  });
  await toRep(c, `Nudge: ${c.cand.full_name} hasn't picked a time`, `<p>${e(c.cand.full_name)} hasn't answered ${e(c.owner.company ?? "the client")}'s times yet. We sent a reminder; a quick call from you may help.</p>`);
}

export async function nudgeOwnerFeedback(m: Meeting) {
  const c = await pathCtx(m.unlock_id);
  if (!c) return;
  await sendEmail({
    to: c.owner.email,
    subject: `Still deciding about ${first(c.cand.full_name)}?`,
    html: `<p>Hi ${e(first(c.owner.full_name))},</p>
<p>Just checking in after your ${whatShort(m)} with ${e(c.cand.full_name)}. Want to keep going, or is it not a fit? Either answer helps ${e(first(c.cand.full_name))} know where they stand.</p>
${btn(ownerLink(c.cand.id), "Let us know")}
${sign()}`,
  });
}

export async function nudgeCandidateRefs(unlockId: string) {
  const c = await pathCtx(unlockId);
  if (!c) return;
  await sendEmail({
    to: c.cand.email,
    subject: `Reminder: your references for ${c.owner.company ?? "the employer"}`,
    html: `<p>Hi ${e(first(c.cand.full_name))},</p>
<p>${e(c.owner.company ?? "The employer")} is waiting on your references. Two or three people is plenty.</p>
${btn(candidatePageLink(c.cand.id), "Add your references")}
${sign()}`,
  });
}

// The client decided it's not a fit: tell the candidate kindly, the rep plainly.
export async function emailOwnerPassed(unlockId: string, reason: string | null) {
  const c = await pathCtx(unlockId);
  if (!c) return;
  const co = c.owner.company ?? "The employer";
  await sendEmail({
    to: c.cand.email,
    subject: `An update from ${co}`,
    html: `<p>Hi ${e(first(c.cand.full_name))},</p>
<p>${e(co)} has decided to go a different direction. That's part of finding the right fit, and it says nothing about what you're worth.</p>
<p>Your profile stays live, other employers are browsing, and we're still in your corner. If you'd like to talk it through, just reply.</p>
${btn(candidatePageLink(c.cand.id), "See your page")}
${sign()}`,
  });
  await toRep(c, `${co} passed on ${c.cand.full_name}`, `<p><strong>${e(co)}</strong> passed on <strong>${e(c.cand.full_name)}</strong>.</p><p><strong>Why:</strong> ${reason ? e(reason) : "No reason given."}</p><p>A kind check-in with ${e(first(c.cand.full_name))} would mean a lot.</p>`);
}
