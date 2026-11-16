import { NextResponse, type NextRequest } from "next/server";
import { draftFinishedCalls } from "@/lib/callDraft";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Every 10 minutes (see vercel.json): 1-hour reminders to candidates, and calls that ended in the last 6 hours get their
// profile drafted as soon as Google's transcript is ready, and the rep is emailed.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  const { sendHourReminders } = await import("@/lib/calls");
  const reminders = await sendHourReminders().catch(() => ({ sent: 0 }));
  const { writeTeamCallNotes } = await import("@/lib/teamCalls");
  await writeTeamCallNotes().catch(() => 0);
  const { stallAlerts } = await import("@/lib/pathEmails");
  const stalls = await stallAlerts().catch(() => ({ stalls: 0 }));
  const { ownerDayEmails } = await import("@/lib/pathEmails");
  await ownerDayEmails().catch((e) => console.error("owner day emails", e));
  const { overdueAlerts } = await import("@/lib/ownerMessages");
  await overdueAlerts().catch(() => null);
  const { chaseWaitingCallbacks } = await import("@/lib/ownerLeads");
  await chaseWaitingCallbacks(Date.now()).catch((e) => console.error("waiting call-backs", e));
  // Texts: what waited overnight, and the one-hour nudge before owner and candidate meet.
  const { flushQueuedTexts } = await import("@/lib/sms");
  await flushQueuedTexts().catch((e) => console.error("queued texts", e));
  await (await import("@/lib/timeAsk")).lapseAsks().catch((e) => console.error("call time asks", e));
  // The second look at new matches, so they're ready before anyone opens the page or an owner is told.
  await (await import("@/lib/matchJudge")).judgePending(5).catch((e) => console.error("match second look", e));
  const { textRoleWatchers } = await import("@/lib/roleWatch");
  await textRoleWatchers().catch((e) => console.error("role watch texts", e));
  const { meetingHourTexts } = await import("@/lib/repMorning");
  await meetingHourTexts().catch((e) => console.error("meeting hour texts", e));
  const r = await draftFinishedCalls({ withinHours: 6 }).catch(() => ({ drafted: 0 }));
  return NextResponse.json({ ...r, ...reminders, ...stalls });
}
