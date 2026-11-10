import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/format";
import { SIDE_COOKIE } from "@/lib/candidateMode";
import { after } from "next/server";
import { recordPointedOpen } from "@/lib/pointed";

// Short links to a listed candidate's profile, e.g. /c/C-6C8762 (their reference code).
export async function GET(req: Request, ctx: RouteContext<"/c/[code]">) {
  const { code } = await ctx.params;
  const tail = code.replace(/^C-/i, "").toLowerCase();
  if (!/^[0-9a-f]{6}$/.test(tail)) return NextResponse.redirect(`${siteUrl()}/candidates`);
  // Listed candidates are a short list, so match the code here.
  const { data } = await db().from("candidates").select("id").eq("status", "listed");
  const hits = ((data ?? []) as { id: string }[]).filter((c) => c.id.replace(/-/g, "").endsWith(tail));
  // Keep "?r=" (who sent the link), so the business owner is credited to that rep.
  const r = (new URL(req.url).searchParams.get("r") ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30);
  const q = r ? `?r=${r}` : "";
  // "&s=…": a profile a rep suggested to someone. Note the open so the rep knows to follow up.
  const s = (new URL(req.url).searchParams.get("s") ?? "").toLowerCase();
  if (s) after(() => recordPointedOpen(s).catch(() => null));
  const res = NextResponse.redirect(hits.length === 1 ? `${siteUrl()}/candidates/${hits[0].id}${q}` : `${siteUrl()}/candidates${q}`);
  // This link is for business owners: always open the profile, even on a phone that
  // once opened a candidate link (and was set to show only the candidate side).
  res.cookies.delete(SIDE_COOKIE);
  return res;
}
