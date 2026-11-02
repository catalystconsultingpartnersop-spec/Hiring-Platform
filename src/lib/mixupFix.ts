import { db, logActivity } from "./db";
import { emailAdmin, escapeHtml, sendEmail } from "./email";
import { getSetting, setSetting } from "./settings";
import { sendBookingEmails } from "./calls";
import { teamUrl } from "./format";
import { withinHours } from "./slots";

// One-time cleanup of the Nov 2 mix-up, when some of Shloimy's candidates
// booked calls with Mechel. Runs once, then never again:
//  1. Calls for Shloimy's candidates that landed with Mechel go back to Shloimy.
//  2. Candidates who signed up today without a rep on file (their link got lost)
//     and booked with Mechel are treated as Shloimy's, since that's where today's
//     sign-ups came from.
// Everyone gets a summary listing each person moved, so Mechel can hand back
// anyone who was really his.
const FLAG = "mixup_fix_2026_11_02";
const SINCE = "2026-11-02T04:00:00Z"; // midnight Eastern, Nov 2

export async function fixNov2Mixup() {
  try {
    if (await getSetting<boolean>(FLAG, false)) return;
    await setSetting(FLAG, true);

    const { data: staff } = await db().from("staff").select("id, full_name, email, active");
    const find = (n: string) => (staff ?? []).find((s) => (s.full_name ?? "").toLowerCase().startsWith(n));
    const shloimy = find("shloimy");
    const mechel = find("mechel");
    if (!shloimy || !mechel) return;

    const { data: calls } = await db()
      .from("onboarding_calls")
      .select("id, starts_at, ends_at, status, candidate_id, candidates(full_name, added_by, created_at)")
      .eq("staff_id", mechel.id)
      .eq("status", "booked");
    type Row = { id: string; starts_at: string; ends_at: string; candidate_id: string; candidates: { full_name: string; added_by: string | null; created_at: string } };
    const moved: string[] = [];
    const stuck: string[] = [];
    for (const k of (calls ?? []) as unknown as Row[]) {
      const c = k.candidates;
      const hisAlready = c.added_by === shloimy.id;
      const lostLink = !c.added_by && c.created_at >= SINCE;
      if (!hisAlready && !lostLink) continue;
      if (lostLink) await db().from("candidates").update({ added_by: shloimy.id }).eq("id", k.candidate_id);
      const { count } = await db()
        .from("onboarding_calls")
        .select("id", { count: "exact", head: true })
        .eq("staff_id", shloimy.id)
        .eq("status", "booked")
        .lt("starts_at", k.ends_at)
        .gt("ends_at", k.starts_at);
      const when = new Date(k.starts_at).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      if (count || !(await withinHours(shloimy.id, k.starts_at, k.ends_at))) {
        stuck.push(`${c.full_name} (${when}): now Shloimy's candidate, but that time isn't in Shloimy's hours, so the call stays with Mechel for now`);
        continue;
      }
      await db().from("onboarding_calls").update({ staff_id: shloimy.id }).eq("id", k.id);
      await sendBookingEmails(k.id, false, true);
      moved.push(`${c.full_name} (${when})${lostLink ? ", signed up today without a rep on file" : ""}`);
    }
    await logActivity("system", "nov2_mixup_fixed", { moved: moved.length, stuck: stuck.length });
    if (!moved.length && !stuck.length) return;

    const list = (xs: string[]) => `<ul>${xs.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
    const html = `<p>Today's mix-up is cleaned up. These calls moved from Mechel to Shloimy, and each candidate got an updated email:</p>
${moved.length ? list(moved) : "<p>None.</p>"}
${stuck.length ? `<p><strong>Needs a look:</strong></p>${list(stuck)}` : ""}
<p>Mechel: if anyone above was really yours, open the candidate, set Rep back to Mechel, and Shloimy can hand the call back on My calls.</p>
<p><a href="${teamUrl()}/admin/calls">Open calls</a></p>`;
    await emailAdmin("Today's mix-up: calls moved to Shloimy", html);
    for (const r of [shloimy, mechel]) if (r.active) await sendEmail({ to: r.email, subject: "Today's mix-up: calls moved to Shloimy", html });
  } catch (e) {
    console.error("mix-up fix failed", e);
  }
}

// Nov 2, part two: the cleanup above moved four calls to Shloimy at times
// that aren't in his hours. Put them back with Mechel exactly as they were,
// quietly: the candidates aren't emailed. Shloimy and Mechel get a team note
// (and Shloimy a calendar cancellation) so they can sort it out together.
const REVERT_FLAG = "mixup_revert_2026_11_02";
const REVERT_NAMES = ["Menachem Heilbrun", "Moddi", "Shlomo Mendlowitz", "Yitzchok Lovi"];

export async function revertNov2Moves() {
  try {
    if (await getSetting<boolean>(REVERT_FLAG, false)) return;
    await setSetting(REVERT_FLAG, true);
    const { data: staff } = await db().from("staff").select("id, full_name, email, active");
    const find = (n: string) => (staff ?? []).find((s) => (s.full_name ?? "").toLowerCase().startsWith(n));
    const shloimy = find("shloimy");
    const mechel = find("mechel");
    if (!shloimy || !mechel) return;
    const { data: calls } = await db()
      .from("onboarding_calls")
      .select("id, starts_at, ends_at, candidate_id, candidates(full_name)")
      .eq("staff_id", shloimy.id)
      .eq("status", "booked")
      .gte("starts_at", "2026-11-03T04:00:00Z")
      .lt("starts_at", "2026-11-04T05:00:00Z");
    type Row = { id: string; starts_at: string; ends_at: string; candidate_id: string; candidates: { full_name: string } };
    const back = ((calls ?? []) as unknown as Row[]).filter((k) => REVERT_NAMES.includes(k.candidates.full_name.trim()));
    const lines: string[] = [];
    const { callIcs } = await import("./ics");
    for (const k of back) {
      await db().from("onboarding_calls").update({ staff_id: mechel.id }).eq("id", k.id);
      await db().from("candidates").update({ added_by: null }).eq("id", k.candidate_id);
      const when = new Date(k.starts_at).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      lines.push(`${k.candidates.full_name} (${when})`);
      if (shloimy.active)
        await sendEmail({
          to: shloimy.email,
          subject: `Removed from your calendar: call with ${k.candidates.full_name}`,
          html: `<p>This call is back with Mechel (${escapeHtml(when)}). It's been taken off your calendar.</p>`,
          attachments: [
            {
              filename: "cancelled.ics",
              content: callIcs({ uid: `${k.id}@hiring-platform`, start: k.starts_at, end: k.ends_at, title: `Onboarding call: ${k.candidates.full_name}`, description: "Back with Mechel.", cancelled: true }),
            },
          ],
        });
    }
    await logActivity("system", "nov2_moves_reverted", { count: back.length });
    if (!lines.length) return;
    const html = `<p>These calls are back with Mechel, at the same times the candidates originally booked. The candidates were <strong>not</strong> emailed. Their video links haven't changed, so on the day they'll click the same link and Mechel will be there.</p>
<ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
<p>None of these four has a rep on file right now. Shloimy and Mechel: please talk it through and decide who keeps each one. Shloimy can now move calls and candidates between reps himself, with or without emailing the candidate.</p>
<p><a href="${teamUrl()}/admin/calls">Open calls</a></p>`;
    await emailAdmin("Calls put back with Mechel (quietly)", html);
    for (const r of [shloimy, mechel]) if (r.active) await sendEmail({ to: r.email, subject: "Calls put back with Mechel (quietly)", html });
  } catch (e) {
    console.error("revert failed", e);
  }
}
