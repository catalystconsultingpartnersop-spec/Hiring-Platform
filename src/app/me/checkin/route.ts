import { NextResponse, type NextRequest } from "next/server";
import { db, logActivity } from "@/lib/db";
import { clearCatalog } from "@/lib/catalog";
import { refCode } from "@/lib/format";
import { readSignedToken, startCandidateSession } from "@/lib/session";

// The one-tap answers in the "still looking?" check-in email.
export async function GET(req: NextRequest) {
  const id = readSignedToken(req.nextUrl.searchParams.get("t"), "cand_");
  if (!id) return NextResponse.redirect(new URL("/me/login?error=expired", req.url));
  await startCandidateSession(id);
  if (req.nextUrl.searchParams.get("a") === "hired") return NextResponse.redirect(new URL("/me/hired", req.url));
  await db().from("candidates").update({ last_checkin_at: new Date().toISOString() }).eq("id", id);
  await logActivity("system", "candidate_still_looking", { candidate: refCode(id) });
  // If we paused their profile for not answering, "still looking" puts it back.
  const { data: paused } = await db().from("activity_log").select("at").eq("action", "candidate_auto_paused").eq("details->>candidate", refCode(id)).order("at", { ascending: false }).limit(1);
  if (paused?.length) {
    const { data: back } = await db().from("candidates").update({ status: "listed", self_paused_at: null }).eq("id", id).eq("status", "paused").not("self_paused_at", "is", null).select("id");
    if (back?.length) {
      clearCatalog();
      await logActivity("system", "candidate_back_after_pause", { candidate: refCode(id) });
      return NextResponse.redirect(new URL("/me?done=back", req.url));
    }
  }
  return NextResponse.redirect(new URL("/me?done=looking", req.url));
}
