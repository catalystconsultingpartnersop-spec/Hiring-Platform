import { NextResponse } from "next/server";
import { cleanResumeOf } from "@/lib/cleanResume";
import { cleanResumePdf } from "@/lib/cleanResumePdf";
import { db } from "@/lib/db";
import { canSeeCandidate } from "@/lib/reps";
import { currentStaff } from "@/lib/session";

export const runtime = "nodejs";

// The clean resume we made, as a PDF. Team only for now.
export async function GET(req: Request, ctx: RouteContext<"/api/clean-resume/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const me = await currentStaff();
  if (!me || !(await canSeeCandidate(me, id))) return new NextResponse("Not allowed", { status: 403 });
  const { data: c } = await db().from("candidates").select("full_name, application").eq("id", id).maybeSingle();
  const clean = cleanResumeOf(c?.application);
  if (!c || !clean) return new NextResponse("No clean resume yet", { status: 404 });
  const pdf = await cleanResumePdf(clean.text);
  const who = (c.full_name ?? "").replace(/[^\p{L}\p{N} .'-]/gu, "").trim() || "Candidate";
  const filename = `${who} - Resume.pdf`;
  const download = new URL(req.url).searchParams.has("download");
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
