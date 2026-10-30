import { db, logActivity } from "./db";
import { sendEmail } from "./email";
import { candidate as candMail } from "./emails";
import { candidateUrl, refCode } from "./format";
import { repFor } from "./notify";
import { signedToken } from "./session";

// The candidate agreement: a short agreement every candidate signs before
// their profile goes live. It doesn't cost them anything; they agree to tell us
// when they're hired, anywhere, and by whom if it came through us.

// How it works for them: plain facts.
export const HOW_IT_WORKS = [
  "It doesn't cost you a thing.",
  "Your name and contact details are shared only with employers who sign to meet you.",
];

// What we ask of them.
export const YOUR_PART = [
  "If you get hired anywhere, let us know within 7 days, so we can take your profile down.",
  "If you're hired by an employer you met through us, tell us who.",
  "Keep your details up to date, and be honest with us and with employers.",
];

// A signed link that opens the candidate's page, then a given section.
export function candidateLinkTo(candidateId: string, to: "promise" | "hired" | "looking" | "") {
  const t = encodeURIComponent(signedToken(`cand_${candidateId}`, 30));
  if (to === "looking" || to === "hired") return `${candidateUrl()}/me/checkin?t=${t}&a=${to}`;
  return `${candidateUrl()}/me/open?t=${t}${to ? `&to=${to}` : ""}`;
}

// Emails the candidate their agreement to sign. listOnSign: their profile goes
// live the moment they sign.
export async function requestPromise(candidateId: string, listOnSign: boolean) {
  const { data: c } = await db().from("candidates").select("full_name, email, promise_signed_at").eq("id", candidateId).single();
  if (!c || c.promise_signed_at) return { ok: false };
  const rep = await repFor(candidateId);
  await db()
    .from("candidates")
    .update({ promise_requested_at: new Date().toISOString(), ...(listOnSign ? { list_on_sign: true } : {}) })
    .eq("id", candidateId);
  const r = await sendEmail({
    to: c.email,
    ...candMail.promiseRequest({ name: c.full_name, rep: rep?.full_name ?? null, link: candidateLinkTo(candidateId, "promise") }),
    replyTo: rep?.email,
  });
  await logActivity("system", "promise_requested", { candidate: refCode(candidateId), sent: r.ok });
  return r;
}

const DAY = 864e5;

// Run once a day (from the daily cron):
// 1. Candidates who went live before the promise existed get asked to sign it, once.
// 2. Listed candidates get a one-tap "still looking?" check-in every 3 weeks.
export async function dailyCandidateCheckins() {
  const sent = { promise: 0, checkin: 0 };
  const { data, error } = await db().from("candidates").select("*").eq("status", "listed");
  if (error || !data) return sent;
  const now = Date.now();
  type Row = { id: string; full_name: string; email: string; listed_at: string | null; promise_signed_at?: string | null; promise_requested_at?: string | null; last_checkin_at?: string | null; checkin_sent_at?: string | null };
  for (const c of data as Row[]) {
    if (!("promise_signed_at" in c)) break; // the database hasn't been updated yet
    try {
      if (!c.promise_signed_at && !c.promise_requested_at && sent.promise < 40) {
        await requestPromise(c.id, false);
        sent.promise++;
        continue;
      }
      const last = Math.max(...[c.listed_at, c.last_checkin_at, c.checkin_sent_at].map((d) => (d ? Date.parse(d) : 0)));
      if (last && last < now - 21 * DAY && sent.checkin < 40) {
        await sendEmail({
          to: c.email,
          ...candMail.checkIn({ name: c.full_name, looking: candidateLinkTo(c.id, "looking"), hired: candidateLinkTo(c.id, "hired") }),
        });
        await db().from("candidates").update({ checkin_sent_at: new Date().toISOString() }).eq("id", c.id);
        sent.checkin++;
      }
    } catch (e) {
      console.error("candidate check-in failed", c.id, e);
    }
  }
  if (sent.promise || sent.checkin) await logActivity("system", "candidate_checkins", sent);
  return sent;
}
