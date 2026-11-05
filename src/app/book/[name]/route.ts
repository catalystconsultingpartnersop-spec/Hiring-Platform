import { NextResponse } from "next/server";
import { candidateUrl } from "@/lib/format";
import { REF_COOKIE, refSlug } from "@/lib/shareKit";

// A rep's own booking link, e.g. /book/shloimy: remembers the rep and opens the
// sign-up with that rep picked and only their times showing.
export async function GET(_req: Request, ctx: RouteContext<"/book/[name]">) {
  const { name } = await ctx.params;
  const r = refSlug(decodeURIComponent(name));
  const res = NextResponse.redirect(`${candidateUrl()}/apply`);
  if (r) res.cookies.set(REF_COOKIE, r, { maxAge: 90 * 86400, path: "/", sameSite: "lax", httpOnly: true });
  return res;
}
