import { NextResponse } from "next/server";
import { clipUrl } from "@/lib/clips";
import { requireStaff } from "@/lib/session";

// Hands a signed-in team member a one-hour link to a candidate's clip or picture.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const k = new URL(req.url).searchParams.get("kind");
  const url = await clipUrl(id, k === "photo" ? "photo" : k === "face" ? "face" : "video");
  if (!url) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(url, { headers: { "Cache-Control": "private, max-age=1800" } });
}
