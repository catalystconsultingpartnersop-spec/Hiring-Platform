import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/format";

// Short links to a listed candidate's profile, e.g. /c/C-6C8762 (their reference code).
export async function GET(_req: Request, ctx: RouteContext<"/c/[code]">) {
  const { code } = await ctx.params;
  const tail = code.replace(/^C-/i, "").toLowerCase();
  if (!/^[0-9a-f]{6}$/.test(tail)) return NextResponse.redirect(`${siteUrl()}/candidates`);
  // Listed candidates are a short list, so match the code here.
  const { data } = await db().from("candidates").select("id").eq("status", "listed");
  const hits = ((data ?? []) as { id: string }[]).filter((c) => c.id.replace(/-/g, "").endsWith(tail));
  return NextResponse.redirect(hits.length === 1 ? `${siteUrl()}/candidates/${hits[0].id}` : `${siteUrl()}/candidates`);
}
