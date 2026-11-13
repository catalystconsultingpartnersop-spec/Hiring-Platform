import { db, logActivity } from "./db";
import { sendEmail } from "./email";
import { candidate as candMail } from "./emails";
import { candidateUrl, refCode, teamUrl } from "./format";
import { escapeHtml } from "./email";
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
    ...candMail.promiseRequest({ name: c.full_name, rep: rep?.full_name ?? null, link: candidateLinkTo(candidateId, "promise"), waiting: listOnSign }),
    replyTo: rep?.email,
  });
  await logActivity("system", "promise_requested", { candidate: refCode(candidateId), sent: r.ok });
  return r;
}

const DAY = 864e5;
const EVERY = 14; // days between "still looking?" emails

// How many check-ins in a row this candidate hasn't answered.
async function unansweredAsks(c: { id: string; last_checkin_at?: string | null }) {
  // Counting starts over after an answer, or after a pause (so a profile that
  // was put back isn't paused again the next morning).
  const { data: p } = await db().from("activity_log").select("at").eq("action", "candidate_auto_paused").eq("details->>candidate", refCode(c.id)).order("at", { ascending: false }).limit(1);
  const from = [c.last_checkin_at, (p?.[0] as { at: string } | undefined)?.at].filter((d): d is string => !!d).sort().pop();
  let q = db().from("activity_log").select("id", { count: "exact", head: true }).eq("action", "candidate_checkin_sent").eq("details->>candidate", refCode(c.id));
  if (from) q = q.gt("at", from);
  const { count } = await q;
  return count ?? 0;
}

// Profiles used to wait for the candidate's signature before going live. They
// don't anymore, so anyone still waiting goes live now.
export async function releaseWaitingProfiles() {
  try {
    const { data } = await db().from("candidates").select("id, listed_at").eq("status", "draft").eq("list_on_sign", true);
    if (!data?.length) return 0;
    const now = new Date().toISOString();
    for (const c of data as { id: string; listed_at: string | null }[])
      await db().from("candidates").update({ status: "listed", listed_at: c.listed_at ?? now, list_on_sign: false }).eq("id", c.id);
    const { clearCatalog } = await import("./catalog");
    clearCatalog();
    await logActivity("system", "profiles_released", { count: data.length });
    return data.length;
  } catch {
    return 0;
  }
}

// Run once a day (from the daily cron): each listed candidate gets a personal
// "still looking?" email from their rep every two weeks. Replies go to the rep.
// Two in a row with no answer: the profile is paused on its own, and one tap
// brings it back.
// (Asking already-live candidates to sign the agreement is done by reps, one by
// one, from the candidate's profile.)
export async function dailyCandidateCheckins() {
  const sent = { checkin: 0 };
  const { data, error } = await db().from("candidates").select("*").eq("status", "listed");
  if (error || !data) return sent;
  const now = Date.now();
  const since = new Date(now - EVERY * DAY).toISOString();

  // Anyone actively engaged is left alone: an introduction in progress, a
  // recent or upcoming onboarding call, or a recent message to us.
  const ids = (data as { id: string }[]).map((c) => c.id);
  const [{ data: intros }, { data: calls }, { data: notes }] = await Promise.all([
    db().from("unlocks").select("candidate_id, passed_at, candidate_declined_at, hires(status)").in("candidate_id", ids).not("confirmed_at", "is", null),
    db().from("onboarding_calls").select("candidate_id").in("candidate_id", ids).neq("status", "cancelled").gte("starts_at", since),
    db().from("contact_requests").select("candidate_id").in("candidate_id", ids).gte("created_at", since),
  ]);
  const busy = new Set<string>();
  for (const u of (intros ?? []) as { candidate_id: string; passed_at: string | null; candidate_declined_at: string | null; hires: { status: string }[] }[]) {
    const done = u.passed_at || u.candidate_declined_at || u.hires.some((h) => ["paid", "hired", "refunded"].includes(h.status));
    if (!done) busy.add(u.candidate_id);
  }
  for (const r of [...(calls ?? []), ...(notes ?? [])] as { candidate_id: string | null }[]) if (r.candidate_id) busy.add(r.candidate_id);

  type Row = { id: string; full_name: string; email: string; listed_at: string | null; updated_at?: string | null; last_checkin_at?: string | null; checkin_sent_at?: string | null };
  for (const c of data as Row[]) {
    if (!("checkin_sent_at" in c)) break; // the database hasn't been updated yet
    try {
      if (busy.has(c.id)) continue;
      // Quiet for two weeks: no check-in, answer or profile update in that time.
      const last = Math.max(...[c.listed_at, c.updated_at, c.last_checkin_at, c.checkin_sent_at].map((d) => (d ? Date.parse(d) : 0)));
      if (!last || last > now - EVERY * DAY || sent.checkin >= 40) continue;
      // Already asked twice with no answer: no third ask, the pause below takes over.
      if ((await unansweredAsks(c)) >= 2) continue;
      const rep = await repFor(c.id);
      await sendEmail({
        to: c.email,
        ...candMail.checkIn({
          name: c.full_name,
          rep: rep?.active ? rep.full_name : null,
          looking: candidateLinkTo(c.id, "looking"),
          hired: candidateLinkTo(c.id, "hired"),
        }),
        replyTo: rep?.active ? rep.email : undefined,
        fromName: rep?.active ? rep.full_name ?? undefined : undefined,
      });
      await db().from("candidates").update({ checkin_sent_at: new Date().toISOString() }).eq("id", c.id);
      await logActivity("system", "candidate_checkin_sent", { candidate: refCode(c.id) });
      sent.checkin++;
    } catch (e) {
      console.error("candidate check-in failed", c.id, e);
    }
  }
  // No answer 5 days after a check-in: tell their rep, once, so the catalog
  // only shows people who are really looking.
  let nudged = 0;
  for (const c of data as Row[]) {
    if (!("checkin_sent_at" in c) || !c.checkin_sent_at) continue;
    const askedAt = Date.parse(c.checkin_sent_at);
    const answered = c.last_checkin_at && Date.parse(c.last_checkin_at) >= askedAt;
    if (answered || askedAt > now - 5 * DAY || busy.has(c.id)) continue;
    try {
      const { count } = await db()
        .from("activity_log")
        .select("id", { count: "exact", head: true })
        .eq("action", "checkin_no_reply")
        .eq("details->>candidate", refCode(c.id))
        .gte("at", c.checkin_sent_at);
      if (count) continue;
      const rep = await repFor(c.id);
      const to = rep?.active ? rep.email : process.env.ADMIN_EMAIL;
      if (!to) continue;
      const first = (rep?.full_name ?? "").split(" ")[0] || "there";
      await sendEmail({
        to,
        subject: `${c.full_name} hasn't answered their check-in`,
        html: `<p>Hi ${escapeHtml(first)},</p>
<p>We emailed <strong>${escapeHtml(c.full_name)}</strong> ${new Date(askedAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })} to ask if they're still looking for work, and they haven't answered.</p>
<p>Please give them a quick call. If they're no longer looking, or you can't reach them, set their profile to <strong>Paused</strong> so employers only see people who are ready.</p>
<p><a href="${teamUrl()}/admin/candidates/${c.id}">Open their profile</a></p>`,
        replyTo: c.email,
      });
      await logActivity("system", "checkin_no_reply", { candidate: refCode(c.id), rep: rep?.email ?? null });
      nudged++;
    } catch (e) {
      console.error("check-in follow-up failed", c.id, e);
    }
  }

  // Two check-ins in a row with no answer, and a week since the second: pause
  // the profile so employers only see people who are really looking. The
  // candidate gets a one-tap way back, and their rep is told.
  let paused = 0;
  for (const c of data as Row[]) {
    if (!("checkin_sent_at" in c) || !c.checkin_sent_at || busy.has(c.id)) continue;
    const askedAt = Date.parse(c.checkin_sent_at);
    const answered = c.last_checkin_at && Date.parse(c.last_checkin_at) >= askedAt;
    if (answered || askedAt > now - 7 * DAY) continue;
    try {
      if ((await unansweredAsks(c)) < 2) continue;
      await db().from("candidates").update({ status: "paused", self_paused_at: new Date().toISOString() }).eq("id", c.id).eq("status", "listed");
      await logActivity("system", "candidate_auto_paused", { candidate: refCode(c.id) });
      const rep = await repFor(c.id);
      await sendEmail({
        to: c.email,
        ...candMail.autoPaused({ name: c.full_name, rep: rep?.active ? rep.full_name : null, back: candidateLinkTo(c.id, "looking"), hired: candidateLinkTo(c.id, "hired") }),
        replyTo: rep?.active ? rep.email : undefined,
        fromName: rep?.active ? rep.full_name ?? undefined : undefined,
      });
      const to = rep?.active ? rep.email : process.env.ADMIN_EMAIL;
      if (to)
        await sendEmail({
          to,
          subject: `${c.full_name}'s profile was paused (no answer to two check-ins)`,
          html: `<p>We asked <strong>${escapeHtml(c.full_name)}</strong> twice if they're still looking for work, and didn't hear back, so their profile is hidden from employers for now.</p>
<p>They got an email with one button to put it back. You can also turn it back on yourself from their profile.</p>
<p><a href="${teamUrl()}/admin/candidates/${c.id}">Open their profile</a></p>`,
          replyTo: c.email,
        });
      paused++;
    } catch (e) {
      console.error("auto-pause failed", c.id, e);
    }
  }
  if (paused) {
    const { clearCatalog } = await import("./catalog");
    clearCatalog();
  }

  if (sent.checkin || nudged || paused) await logActivity("system", "candidate_checkins", { ...sent, repsNudged: nudged, paused });
  return { ...sent, repsNudged: nudged, paused };
}
