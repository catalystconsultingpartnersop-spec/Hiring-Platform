import { NextResponse, type NextRequest } from "next/server";
import { draftFinishedCalls } from "@/lib/callDraft";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Every 10 minutes (see vercel.json): calls that ended in the last 6 hours get their
// profile drafted as soon as Google's transcript is ready, and the rep is emailed.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  const r = await draftFinishedCalls({ withinHours: 6 }).catch(() => ({ drafted: 0 }));
  return NextResponse.json(r);
}
