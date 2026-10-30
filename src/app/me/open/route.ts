import { NextResponse, type NextRequest } from "next/server";
import { readSignedToken, startCandidateSession } from "@/lib/session";

// Links in candidate emails: open their page (or one part of it), signed in.
const PLACES: Record<string, string> = { promise: "/me/promise", hired: "/me/hired" };

export async function GET(req: NextRequest) {
  const id = readSignedToken(req.nextUrl.searchParams.get("t"), "cand_");
  if (!id) return NextResponse.redirect(new URL("/me/login?error=expired", req.url));
  await startCandidateSession(id);
  const to = PLACES[req.nextUrl.searchParams.get("to") ?? ""] ?? "/me";
  return NextResponse.redirect(new URL(to, req.url));
}
