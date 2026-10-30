import { NextResponse, type NextRequest } from "next/server";
import { db, logActivity } from "@/lib/db";
import { dailyCandidateCheckins } from "@/lib/promise";
import { happened, Meeting, RefRequest } from "@/lib/path";
import { emailAskFeedback, nudgeCandidateRefs, nudgeCandidateToPick, nudgeOwnerFeedback, nudgeOwnerToStart } from "@/lib/pathEmails";

export const dynamic = "force-dynamic";

const DAY = 864e5;

// Runs once a day (see vercel.json). Keeps every introduction moving:
// asks how calls went, and nudges whoever is up next. Each nudge goes once.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  // Candidate agreement requests and "still looking?" check-ins: paused until
  // Heshy decides how reps should handle them.
  const checkins = process.env.CANDIDATE_CHECKINS === "on" ? await dailyCandidateCheckins().catch(() => null) : null;

  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  const sent = { feedback: 0, ownerStart: 0, pick: 0, ownerFeedback: 0, refs: 0 };

  // Active introductions only.
  const { data: unlocks } = await db()
    .from("unlocks")
    .select("id, confirmed_at, passed_at, candidate_declined_at, owner_nudged_at, candidates(status), hires(status)")
    .not("confirmed_at", "is", null)
    .is("passed_at", null)
    .is("candidate_declined_at", null);
  type U = { id: string; confirmed_at: string; owner_nudged_at: string | null; candidates: { status: string }; hires: { status: string }[] };
  const active = ((unlocks ?? []) as unknown as U[]).filter(
    (u) => u.candidates.status !== "hired" && !u.hires.some((h) => h.status === "paid" || h.status === "hired"),
  );
  const ids = active.map((u) => u.id);
  if (!ids.length) return NextResponse.json({ ok: true, sent, checkins });

  const [{ data: ms }, { data: rs }] = await Promise.all([
    db().from("meetings").select("*").in("unlock_id", ids),
    db().from("reference_requests").select("*").in("unlock_id", ids).is("given_at", null),
  ]);
  const meetings = (ms ?? []) as Meeting[];
  const refs = (rs ?? []) as RefRequest[];

  for (const u of active) {
    const mine = meetings.filter((m) => m.unlock_id === u.id);
    // Unlocked two days ago and nothing offered yet: nudge the client once.
    if (!mine.length && !u.owner_nudged_at && Date.parse(u.confirmed_at) < now - 2 * DAY) {
      await nudgeOwnerToStart(u.id);
      await db().from("unlocks").update({ owner_nudged_at: iso(now) }).eq("id", u.id);
      sent.ownerStart++;
    }
  }

  for (const m of meetings) {
    try {
      if (m.status === "proposed" && !m.nudged_at && Date.parse(m.created_at) < now - 2 * DAY) {
        await nudgeCandidateToPick(m);
        await db().from("meetings").update({ nudged_at: iso(now) }).eq("id", m.id);
        sent.pick++;
      } else if (happened(m, now) && !m.asked_feedback_at && (!m.owner_verdict || !m.candidate_verdict)) {
        await emailAskFeedback(m);
        await db().from("meetings").update({ asked_feedback_at: iso(now) }).eq("id", m.id);
        sent.feedback++;
      } else if (happened(m, now) && m.asked_feedback_at && !m.owner_verdict && !m.nudged_at && Date.parse(m.asked_feedback_at) < now - 2 * DAY) {
        await nudgeOwnerFeedback(m);
        await db().from("meetings").update({ nudged_at: iso(now) }).eq("id", m.id);
        sent.ownerFeedback++;
      }
    } catch (e) {
      console.error("path nudge failed", m.id, e);
    }
  }

  for (const r of refs) {
    if (!r.nudged_at && Date.parse(r.created_at) < now - 2 * DAY) {
      await nudgeCandidateRefs(r.unlock_id);
      await db().from("reference_requests").update({ nudged_at: iso(now) }).eq("id", r.id);
      sent.refs++;
    }
  }

  if (Object.values(sent).some(Boolean)) await logActivity("system", "path_nudges", sent);
  return NextResponse.json({ ok: true, sent, checkins });
}
