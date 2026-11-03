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
  const path = req.nextUrl.pathname;
  if (path === "/" && host.startsWith("team.")) return NextResponse.redirect(new URL("/admin", req.url));
  // The team address is only for the back office. Public pages live on the main
  // site, so search engines don't see the same page twice.
  const site = process.env.SITE_URL;
  if (host.startsWith("team.") && site && hostOf(site) !== host) {
    return NextResponse.redirect(new URL(path + req.nextUrl.search, site), 308);
  }
  const candidateHost = hostOf(process.env.CANDIDATE_URL);
  const res =
    path === "/" && candidateHost && host === candidateHost && candidateHost !== hostOf(process.env.SITE_URL)
      ? NextResponse.rewrite(new URL("/join", req.url))
      : NextResponse.next();
  // A share link (?r=name) remembers who sent this visitor, for 90 days.
  // Someone who lands on the candidate page from outside (a shared link, the
  // flyer, a typed address) is treated as a candidate: while the catalog fills
  // up they see only the candidate side. ?for=business switches that off.
  if (path === "/join" && !host.startsWith("team.")) {
    const referer = hostOf(req.headers.get("referer") ?? undefined);
    const ours = referer && (referer === host || referer === candidateHost || referer === hostOf(process.env.SITE_URL));
    if (!ours && !req.cookies.get("tcc_side")) res.cookies.set("tcc_side", "candidate", { maxAge: 90 * 86400, path: "/", sameSite: "lax", httpOnly: true });
  }
  if (req.nextUrl.searchParams.get("for") === "business") res.cookies.delete("tcc_side");
  const ref = (req.nextUrl.searchParams.get("r") ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30);
  if (ref && !host.startsWith("team.")) res.cookies.set("tcc_ref", ref, { maxAge: 90 * 86400, path: "/", sameSite: "lax", httpOnly: true });
  return res;
}

export const config = {
  matcher: ["/", "/why", "/mission", "/apply", "/contact", "/privacy", "/strengths", "/candidates", "/candidates/:path*", "/join", "/join/:path*", "/hiring-help", "/hiring-help/:path*"],
};
