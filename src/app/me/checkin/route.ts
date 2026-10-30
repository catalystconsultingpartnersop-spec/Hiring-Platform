import { NextResponse, type NextRequest } from "next/server";
import { db, logActivity } from "@/lib/db";
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
  return NextResponse.redirect(new URL("/me?done=looking", req.url));
}
