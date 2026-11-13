import { candidateUrl, siteUrl, teamUrl } from "./format";
import { sendText } from "./sms";
import { staffPhones } from "./staffPhones";

// Every text we send, in one place, so the wording is easy to read and change.
// Texts are extra: the email for each of these still goes out. sendText checks
// that the person agreed to texts, and holds anything between 9pm and 8am.

const first = (n: string | null | undefined) => (n ?? "").trim().split(/\s+/)[0] || "";
const mePage = () => `${candidateUrl()}/me`;
const profile = (candidateId: string) => `${siteUrl()}/candidates/${candidateId}`;

async function toStaff(staffId: string | null | undefined, body: string, kind: string, once?: string) {
  if (!staffId) return;
  const phone = (await staffPhones())[staffId];
  if (phone) await sendText({ to: phone, body, kind, once });
}

// ---- Candidates ----

export const textCandidate = {
  callBooked: (c: { phone: string | null }, rep: string, when: string, callId: string) =>
    sendText({ to: c.phone, kind: "cand_call_booked", once: `cand_call_booked:${callId}:${when}`, body: `Your call with ${first(rep) || "our team"} is booked for ${when}. The link is in your email.` }),
  callCancelled: (c: { phone: string | null }, when: string, callId: string) =>
    sendText({ to: c.phone, kind: "cand_call_cancelled", once: `cand_call_cancelled:${callId}:${when}`, body: `Your call on ${when} was cancelled. You can pick a new time from the email we sent.` }),
  callInAnHour: (c: { phone: string | null }, rep: string, clock: string, callId: string) =>
    sendText({ to: c.phone, kind: "cand_call_reminder", once: `cand_call_reminder:${callId}`, body: `Reminder: your call with ${first(rep) || "our team"} is today at ${clock}. The link is in your email.` }),
  wantsToMeet: (c: { phone: string | null }, company: string, unlockId: string) =>
    sendText({ to: c.phone, kind: "cand_intro", once: `cand_intro:${unlockId}`, body: `Good news: ${company} would like to meet you. See the details: ${mePage()}` }),
  timesOffered: (c: { phone: string | null }, company: string, what: string, meetingId: string) =>
    sendText({ to: c.phone, kind: "cand_times", once: `cand_times:${meetingId}`, body: `${company} offered times for a ${what}. Pick the one that works for you: ${mePage()}` }),
  booked: (c: { phone: string | null }, company: string, what: string, when: string, meetingId: string) =>
    sendText({ to: c.phone, kind: "cand_booked", once: `cand_booked:${meetingId}:${when}`, body: `You're set: your ${what} with ${company} is ${when}. Details are in your email.` }),
  keepGoing: (c: { phone: string | null }, company: string, meetingId: string) =>
    sendText({ to: c.phone, kind: "cand_keep_going", once: `cand_keep_going:${meetingId}`, body: `${company} would like to keep going with you. See what's next: ${mePage()}` }),
  references: (c: { phone: string | null }, company: string, unlockId: string) =>
    sendText({ to: c.phone, kind: "cand_refs", once: `cand_refs:${unlockId}:${new Date().toISOString().slice(0, 10)}`, body: `${company} asked for your references. That's a good sign. Send them here: ${mePage()}` }),
  inAnHour: (c: { phone: string | null }, company: string, what: string, clock: string, meetingId: string) =>
    sendText({ to: c.phone, kind: "cand_meeting_reminder", once: `cand_meeting_reminder:${meetingId}`, body: `Reminder: your ${what} with ${company} is today at ${clock}.` }),
};

// ---- Business owners ----

export const textOwner = {
  pickedTime: (o: { phone: string | null }, cand: string, what: string, when: string, candidateId: string, meetingId: string) =>
    sendText({ to: o.phone, kind: "owner_booked", once: `owner_booked:${meetingId}:${when}`, body: `Your ${what} with ${first(cand)} is set for ${when}. The invite is in your email.` }),
  needsOtherTimes: (o: { phone: string | null }, cand: string, candidateId: string, meetingId: string) =>
    sendText({ to: o.phone, kind: "owner_retime", once: `owner_retime:${meetingId}`, body: `${first(cand)} couldn't make those times. Offer a few new ones here: ${profile(candidateId)}` }),
  keepGoing: (o: { phone: string | null }, cand: string, candidateId: string, meetingId: string) =>
    sendText({ to: o.phone, kind: "owner_keep_going", once: `owner_keep_going:${meetingId}`, body: `${first(cand)} would like to keep going. Set up the next step here: ${profile(candidateId)}` }),
  references: (o: { phone: string | null }, cand: string, candidateId: string, unlockId: string) =>
    sendText({ to: o.phone, kind: "owner_refs", once: `owner_refs:${unlockId}:${new Date().toISOString().slice(0, 10)}`, body: `${first(cand)} sent references. See them here: ${profile(candidateId)}` }),
  inAnHour: (o: { phone: string | null }, cand: string, what: string, clock: string, meetingId: string) =>
    sendText({ to: o.phone, kind: "owner_meeting_reminder", once: `owner_meeting_reminder:${meetingId}`, body: `Reminder: your ${what} with ${first(cand)} is today at ${clock}.` }),
  videoCallBooked: (o: { phone: string | null }, names: string, when: string, token: string) =>
    sendText({ to: o.phone, kind: "owner_video_booked", once: `owner_video_booked:${token}`, body: `You're booked with ${names}: ${when}. The link is in your email.` }),
};

// ---- Our team ----

export const textTeam = {
  // A candidate booked, or cancelled, a call with this rep.
  callBooked: (staffId: string, cand: string, when: string, callId: string) =>
    toStaff(staffId, `${cand} booked a call with you: ${when}.`, "rep_call_booked", `rep_call_booked:${callId}:${when}`),
  callCancelled: (staffId: string, cand: string, when: string, callId: string) =>
    toStaff(staffId, `${cand} cancelled the call on ${when}.`, "rep_call_cancelled", `rep_call_cancelled:${callId}:${when}`),
  // An owner asked for a call back: the one where minutes matter.
  callBack: (staffId: string, name: string, role: string, phone: string, leadKey: string) =>
    toStaff(staffId, `Call back: ${name}, hiring for ${role}. ${phone}`, "lead_callback", `lead_callback:${leadKey}:${staffId}`),
  ownerBookedVideo: (staffId: string, name: string, role: string, when: string, token: string) =>
    toStaff(staffId, `${name} booked a call with us: ${when}. Hiring for ${role}.`, "lead_video", `lead_video:${token}:${staffId}`),
  morning: (staffId: string, line: string, day: string) => toStaff(staffId, `${line} ${teamUrl()}/admin`, "rep_morning", `rep_morning:${staffId}:${day}`),
};
