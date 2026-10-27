import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentOwner, currentStaff } from "@/lib/session";

// Resumes live in private storage. This hands out a 2-minute download link, and
// only to the admin or an owner who has signed for this candidate.
export async function GET(_req: Request, ctx: RouteContext<"/api/resume/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });

  let allowed = !!(await currentStaff());
  if (!allowed) {
    const owner = await currentOwner();
    if (owner) {
      const { data } = await db().from("unlocks").select("id").eq("owner_id", owner.id).eq("candidate_id", id).maybeSingle();
      allowed = !!data;
    }
  }
  if (!allowed) return new NextResponse("Not allowed", { status: 403 });

  const { data: c } = await db().from("candidates").select("resume_path").eq("id", id).maybeSingle();
  if (!c?.resume_path) return new NextResponse("No resume on file", { status: 404 });

  const { data: signed, error } = await db().storage.from("resumes").createSignedUrl(c.resume_path, 120, { download: true });
  if (error || !signed) return new NextResponse("Could not open the resume", { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}
