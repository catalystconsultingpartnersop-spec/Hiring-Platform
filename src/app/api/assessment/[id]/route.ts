import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentStaff } from "@/lib/session";

// The candidate's Working Genius report. Team only; clients never see it.
export async function GET(_req: Request, ctx: RouteContext<"/api/assessment/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  if (!(await currentStaff())) return new NextResponse("Not allowed", { status: 403 });
  const { data: c } = await db().from("candidates").select("*").eq("id", id).maybeSingle();
  if (!c?.assessment_path) return new NextResponse("No report on file", { status: 404 });
  const { data: signed, error } = await db().storage.from("resumes").createSignedUrl(c.assessment_path, 120);
  if (error || !signed) return new NextResponse("Could not open the report", { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}
