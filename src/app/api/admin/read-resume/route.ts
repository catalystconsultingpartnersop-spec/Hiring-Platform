import { NextResponse } from "next/server";
import { resumeBasics, resumeText } from "@/lib/resume";
import { currentStaff } from "@/lib/session";

// Staff only: reads an uploaded resume and returns the contact basics it finds.
// Nothing is stored here; the file is saved when the candidate is saved.
export async function POST(req: Request) {
  if (!(await currentStaff())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const form = await req.formData();
  const file = form.get("resume");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "No file." }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "That file is over 4 MB." }, { status: 400 });
  try {
    const text = await resumeText(Buffer.from(await file.arrayBuffer()), file.type);
    if (!text.trim()) return NextResponse.json({ found: {}, note: "Couldn't read text from this file. Fill in the details by hand." });
    return NextResponse.json({ found: resumeBasics(text) });
  } catch (e) {
    console.error("resume read failed", e);
    return NextResponse.json({ found: {}, note: "Couldn't read this file. Fill in the details by hand." });
  }
}
