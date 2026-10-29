import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { brandName } from "@/lib/format";
import { wordResumeToPdf } from "@/lib/resumePdf";
import { currentOwner, currentStaff } from "@/lib/session";

// Resumes live in private storage. This hands out the resume, as a PDF named
// after the candidate, only to the team or an owner who has signed for them.
// Word resumes are turned into a PDF on the way out.
export async function GET(_req: Request, ctx: RouteContext<"/api/resume/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });

  let allowed = !!(await currentStaff());
  if (!allowed) {
    const owner = await currentOwner();
    if (owner) {
      const { data } = await db().from("unlocks").select("id").eq("owner_id", owner.id).eq("candidate_id", id).not("confirmed_at", "is", null).maybeSingle();
      allowed = !!data;
    }
  }
  if (!allowed) return new NextResponse("Not allowed", { status: 403 });

  const { data: c } = await db().from("candidates").select("resume_path, full_name").eq("id", id).maybeSingle();
  if (!c?.resume_path) return new NextResponse("No resume on file", { status: 404 });
  const who = (c.full_name ?? "").replace(/[^\p{L}\p{N} .'-]/gu, "").trim() || "Candidate";
  const filename = `${who} - Resume.pdf`;

  if (/\.docx$/i.test(c.resume_path)) {
    const { data: file, error } = await db().storage.from("resumes").download(c.resume_path);
    if (!error && file) {
      try {
        const pdf = await wordResumeToPdf(Buffer.from(await file.arrayBuffer()), `${who} - Resume`, brandName());
        return new NextResponse(new Uint8Array(pdf), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
            "Cache-Control": "private, no-store",
          },
        });
      } catch (e) {
        console.error("resume conversion failed", e);
      }
    }
    // If conversion fails, fall back to the original Word file.
  }

  const ext = c.resume_path.split(".").pop() ?? "pdf";
  const { data: signed, error } = await db()
    .storage.from("resumes")
    .createSignedUrl(c.resume_path, 120, { download: ext === "pdf" ? filename : `${who} - Resume.${ext}` });
  if (error || !signed) return new NextResponse("Could not open the resume", { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}
