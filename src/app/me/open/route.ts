import { NextResponse, type NextRequest } from "next/server";
import { readSignedToken, startCandidateSession } from "@/lib/session";

// Links in candidate emails: open their page, signed in.
export async function GET(req: NextRequest) {
  const id = readSignedToken(req.nextUrl.searchParams.get("t"), "cand_");
  if (!id) return NextResponse.redirect(new URL("/me/login?error=expired", req.url));
  await startCandidateSession(id);
  return NextResponse.redirect(new URL("/me", req.url));
}
