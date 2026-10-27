import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { googleEnabled, newGoogleRequest } from "@/lib/google";
import { safeNext } from "@/lib/session";

export async function GET(req: NextRequest) {
  if (!googleEnabled()) return NextResponse.redirect(new URL("/login?error=google", req.url));
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const { url, state, verifier } = newGoogleRequest();
  (await cookies()).set("hp_google", JSON.stringify({ state, verifier, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/google",
    maxAge: 600,
  });
  return NextResponse.redirect(url);
}
