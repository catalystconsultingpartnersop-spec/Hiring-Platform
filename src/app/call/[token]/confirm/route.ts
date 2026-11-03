import { NextResponse, type NextRequest } from "next/server";
import { db, logActivity } from "@/lib/db";
import { readSignedToken } from "@/lib/session";

// "Yes, I'll be there" from the 1-hour reminder: note it for the rep, then show their call.
export async function GET(req: NextRequest, ctx: RouteContext<"/call/[token]/confirm">) {
  const { token } = await ctx.params;
  const callId = readSignedToken(token, "call_");
  if (callId) {
    const { data: k } = await db().from("onboarding_calls").select("id, candidate_id, status").eq("id", callId).maybeSingle();
    if (k?.status === "booked") {
      const { count } = await db().from("activity_log").select("id", { count: "exact", head: true }).eq("action", "call_confirmed").eq("details->>call_id", callId);
      if (!count) await logActivity("system", "call_confirmed", { call_id: callId, candidate_id: k.candidate_id });
    }
  }
  return NextResponse.redirect(new URL(`/call/${token}?confirmed=1`, req.url));
}
