import { NextResponse } from "next/server";
import { ownerResumeFile, summaryPdf } from "@/lib/ownerPacket";
import { packetCandidate } from "@/lib/packetLink";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: RouteContext<"/p/[token]/file">) {
  const { token } = await ctx.params;
  const id = packetCandidate(token);
  if (!id) return new NextResponse("This link has expired.", { status: 404 });
  const f = new URL(req.url).searchParams.get("f") === "resume" ? await ownerResumeFile(id) : await summaryPdf(id);
  if (!f) return new NextResponse("Not on file yet.", { status: 404 });
  const type = /\.pdf$/i.test(f.filename) ? "application/pdf" : /\.png$/i.test(f.filename) ? "image/png" : /\.jpe?g$/i.test(f.filename) ? "image/jpeg" : "application/octet-stream";
  return new NextResponse(new Uint8Array(f.content), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `inline; filename="${f.filename}"; filename*=UTF-8''${encodeURIComponent(f.filename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
