import { db, logActivity } from "./db";
import { escapeHtml as e, sendEmail } from "./email";
import { kit } from "./emailKit";
import { teamUrl } from "./format";
import { loadPath, pathState, Stage, STAGE_TEAM_LABEL } from "./path";
import { textTeam } from "./texts";
import { COMPANY_TZ } from "./time";

// Each morning, every rep gets one clear picture of where their people stand:
// today's calls, every introduction in motion, and who's waiting on whom. So
// they know who to check in with. One email and one short text, once a day,
// and only on days there's something to say.

// Whose move it is at each stage, in the rep's words.
const WAITING_ON: Partial<Record<Stage, "client" | "candidate" | "both" | null>> = {
  offer_call: "client",
  call_retime: "client",
  offer_meeting: "client",
  meeting_retime: "client",
  decide: "client",
  call_proposed: "candidate",
  meeting_proposed: "candidate",
  refs_waiting: "candidate",
  call_feedback: "both",
  meeting_feedback: "both",
  call_booked: null,
  meeting_booked: null,
};

const CHECK_IN: Record<"client" | "candidate" | "both", (cand: string, co: string) => string> = {
  client: (_c, co) => `Worth a check-in with ${co}.`,
  candidate: (c) => `Worth a check-in with ${c}.`,
  both: (c, co) => `Ask ${c} and ${co} how it went.`,
};

type Row = { id: string; candidate_id: string; signed_at: string; passed_at: string | null; candidate_declined_at: string | null; owners: { full_name: string | null; company: string | null } | null; candidates: { id: string; full_name: string; status: string; added_by: string | null } | null; hires: { status: string }[] };

export async function repMornings(nowMs = Date.now()) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: COMPANY_TZ }).format(nowMs);
  const { data: staff } = await db().from("staff").select("id, email, full_name").eq("active", true);
  if (!staff?.length) return 0;
  const { data: already } = await db().from("activity_log").select("details").eq("action", "rep_morning").eq("details->>day", day);
  const done = new Set((already ?? []).map((r) => String((r.details as { staff?: string }).staff ?? "")));

  const { data: unlocks } = await db()
    .from("unlocks")
    .select("id, candidate_id, signed_at, passed_at, candidate_declined_at, owners(full_name, company), candidates(id, full_name, status, added_by), hires(status)")
    .not("confirmed_at", "is", null);
  const rows = ((unlocks ?? []) as unknown as Row[]).filter((u) => u.candidates && !u.passed_at && !u.candidate_declined_at);
  const paths = await loadPath(rows.map((r) => r.id));

  const { data: calls } = await db()
    .from("onboarding_calls")
    .select("staff_id, starts_at, candidates(full_name)")
    .eq("status", "booked")
    .gte("starts_at", new Date(nowMs - 2 * 3600e3).toISOString())
    .lte("starts_at", new Date(nowMs + 20 * 3600e3).toISOString())
    .order("starts_at");
  const clock = (iso: string) => new Intl.DateTimeFormat("en-US", { timeZone: COMPANY_TZ, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  const sameDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: COMPANY_TZ }).format(new Date(iso)) === day;

  let sent = 0;
  for (const s of staff as { id: string; email: string; full_name: string | null }[]) {
    if (done.has(s.id)) continue;
    const first = (s.full_name ?? "").split(" ")[0] || "there";
    const myCalls = ((calls ?? []) as unknown as { staff_id: string; starts_at: string; candidates: { full_name: string } | null }[]).filter((c) => c.staff_id === s.id && sameDay(c.starts_at));
    const mine = rows
      .filter((u) => u.candidates!.added_by === s.id)
      .map((u) => {
        const p = pathState(u, paths, { hireStatus: u.hires?.[0]?.status ?? null, candidateStatus: u.candidates!.status, nowMs });
        return { u, p };
      })
      .filter(({ p }) => !["hired", "passed", "declined", "taken"].includes(p.stage));
    if (!myCalls.length && !mine.length) continue;

    const needs = mine.filter(({ p }) => WAITING_ON[p.stage]);
    const callLines = myCalls.map((c) => `<strong>${e(clock(c.starts_at))}</strong> ${e(c.candidates?.full_name ?? "A candidate")}`);
    const introLines = mine.map(({ u, p }) => {
      const cand = u.candidates!.full_name;
      const co = u.owners?.company || u.owners?.full_name || "the client";
      const who = WAITING_ON[p.stage];
      const tip = who ? ` <span style="color:#6b7386">${e(CHECK_IN[who](cand.split(" ")[0], co))}</span>` : "";
      return `<a href="${teamUrl()}/admin/candidates/${u.candidates!.id}" style="color:#17213a;font-weight:bold">${e(cand)}</a> and ${e(co)}: ${e(STAGE_TEAM_LABEL[p.stage])}.${tip}`;
    });

    const bits = [
      myCalls.length ? `${myCalls.length} call${myCalls.length === 1 ? "" : "s"} today` : "",
      mine.length ? `${mine.length} introduction${mine.length === 1 ? "" : "s"} in motion` : "",
      needs.length ? `${needs.length} worth a check-in` : "",
    ].filter(Boolean);
    const summary = bits.join(", ");

    await sendEmail({
      to: s.email,
      audience: "team",
      subject: `Your morning: ${summary}`,
      html:
        kit.hi(s.full_name) +
        kit.p("Here's where your people stand today.") +
        (callLines.length ? kit.big("Your calls today") + kit.list(callLines) : "") +
        (introLines.length ? kit.big("Introductions in motion") + kit.list(introLines) : "") +
        kit.button(`${teamUrl()}/admin`, "Open my dashboard"),
    }).catch(() => null);
    await textTeam.morning(s.id, `Good morning, ${first}. ${summary.charAt(0).toUpperCase()}${summary.slice(1)}. The details are in your email, or here:`, day);
    await logActivity("system", "rep_morning", { staff: s.id, day, calls: myCalls.length, intros: mine.length, needs: needs.length });
    sent++;
  }
  return sent;
}

// One hour before a call or meeting between an owner and a candidate: a short
// text to both. (Email reminders already go out; this is the nudge on the phone.)
export async function meetingHourTexts(nowMs = Date.now()) {
  const { data } = await db()
    .from("meetings")
    .select("*")
    .eq("status", "booked")
    .gte("starts_at", new Date(nowMs + 40 * 60e3).toISOString())
    .lte("starts_at", new Date(nowMs + 75 * 60e3).toISOString());
  if (!data?.length) return 0;
  const { pathCtx } = await import("./pathEmails");
  const { textCandidate, textOwner } = await import("./texts");
  const { formatInZone } = await import("./time");
  let n = 0;
  for (const m of data as import("./path").Meeting[]) {
    const c = await pathCtx(m.unlock_id);
    if (!c || !m.starts_at) continue;
    const what = m.kind === "call" ? "first call" : "meeting";
    const at = (tz: string) => formatInZone(m.starts_at!, tz, { weekday: undefined, month: undefined, day: undefined, timeZoneName: undefined });
    await textCandidate.inAnHour(c.cand, c.owner.company ?? "the employer", what, at(c.cand.tz), m.id);
    await textOwner.inAnHour(c.owner, c.cand.full_name, what, at(m.time_zone || COMPANY_TZ), m.id);
    n++;
  }
  return n;
}
