import { NextResponse, type NextRequest } from "next/server";

// team.<domain> is the back office: the team link lands straight on the
// dashboard (Heshy's admin view, or each rep's own dashboard after sign-in).
export function proxy(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  if (host.startsWith("team.") && req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/"] };
