import { NextResponse } from "next/server";
import { connectUrl, googleCallsConfigured } from "@/lib/googleCalls";
import { requireAdmin } from "@/lib/session";

export async function GET(req: Request) {
  await requireAdmin();
  if (!googleCallsConfigured()) return NextResponse.redirect(new URL("/admin/settings?google=setup", req.url));
  const { url, state } = connectUrl(new URL(req.url).origin);
  const res = NextResponse.redirect(url);
  res.cookies.set("g_calls_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
