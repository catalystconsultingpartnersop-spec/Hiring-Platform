import { NextResponse } from "next/server";
import { clipPath } from "@/lib/clips";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";

// A candidate's clip or picture, for signed-in team members only. Served from
// here (not a storage link), with byte ranges so phones can play the video.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const k = new URL(req.url).searchParams.get("kind");
  const kind = k === "photo" ? "photo" : k === "face" ? "face" : "video";
  const { data } = await db().storage.from("resumes").download(clipPath(id, kind));
  if (!data) return new NextResponse("Not found", { status: 404 });
  const buf = Buffer.from(await data.arrayBuffer());
  const type = kind === "video" ? "video/mp4" : "image/jpeg";
  const base = { "Content-Type": type, "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600" };
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (m && (m[1] || m[2])) {
    const start = m[1] ? Number(m[1]) : Math.max(0, buf.length - Number(m[2]));
    const end = m[1] && m[2] ? Math.min(Number(m[2]), buf.length - 1) : buf.length - 1;
    if (start > end || start >= buf.length) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${buf.length}` } });
    return new NextResponse(buf.subarray(start, end + 1), { status: 206, headers: { ...base, "Content-Range": `bytes ${start}-${end}/${buf.length}`, "Content-Length": String(end - start + 1) } });
  }
  return new NextResponse(buf, { headers: { ...base, "Content-Length": String(buf.length) } });
}
