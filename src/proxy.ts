import { NextResponse, type NextRequest } from "next/server";

function hostOf(url: string | undefined) {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "").toLowerCase() : "";
  } catch {
    return "";
  }
}

// team.<domain> is the back office: the team link lands straight on the
// dashboard (Heshy's admin view, or each rep's own dashboard after sign-in).
// The candidate domain (CANDIDATE_URL), if there is one, opens on the
// candidate welcome page while keeping its own address.
export function proxy(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");
  if (req.nextUrl.pathname !== "/" && req.nextUrl.pathname !== "/why") return NextResponse.next();
  // A share link (?r=name) remembers who sent this visitor, for 90 days.
  const ref = (req.nextUrl.searchParams.get("r") ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30);
  if (ref && !host.startsWith("team.")) {
    const res = NextResponse.next();
    res.cookies.set("tcc_ref", ref, { maxAge: 90 * 86400, path: "/", sameSite: "lax", httpOnly: true });
    return res;
  }
  if (req.nextUrl.pathname === "/why") return NextResponse.next();
  if (host.startsWith("team.")) return NextResponse.redirect(new URL("/admin", req.url));
  const candidateHost = hostOf(process.env.CANDIDATE_URL);
  if (candidateHost && host === candidateHost && candidateHost !== hostOf(process.env.SITE_URL)) {
    return NextResponse.rewrite(new URL("/join", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/", "/why"] };
