import { NextResponse } from "next/server";
import { logActivity } from "@/lib/db";
import { resumeBasics, resumeKind, resumeText } from "@/lib/resume";
import { currentStaff } from "@/lib/session";

const KEEP = "It will still be attached when you save.";

// Staff only: reads an uploaded resume and returns the contact basics it finds.
// Nothing is stored here; the file is saved when the candidate is saved.
export async function POST(req: Request) {
  if (!(await currentStaff())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const form = await req.formData();
  const file = form.get("resume");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ found: {}, note: "That file looks empty." });
  const kind = resumeKind(file);
  if (!kind) return NextResponse.json({ found: {}, note: "Resumes need to be a PDF or Word file." });
  if (kind === "doc")
    return NextResponse.json({ found: {}, note: `Older Word files (.doc) can't be read automatically, so fill in the details by hand. ${KEEP}` });
  try {
    const text = await resumeText(Buffer.from(await file.arrayBuffer()), kind);
    if (!text.trim())
      return NextResponse.json({
        found: {},
        note: `This looks like a scanned resume (a picture of text), so we couldn't pull out the details. Fill them in by hand. ${KEEP}`,
      });
    return NextResponse.json({ found: resumeBasics(text) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logActivity("system", "resume_read_failed", { file: file.name, error: msg });
    return NextResponse.json({ found: {}, note: `We couldn't read this file automatically, so fill in the details by hand. ${KEEP}` });
  }
}
