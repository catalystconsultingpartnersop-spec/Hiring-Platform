import { NextResponse } from "next/server";
import { logActivity } from "@/lib/db";
import { resumeBasics, resumeKind, resumeText } from "@/lib/resume";
import { draftFromResume } from "@/lib/resumeDraft";
import { currentStaff } from "@/lib/session";
import { allow } from "@/lib/throttle";

export const maxDuration = 60;
const KEEP = "It will still be attached when you save.";

// Staff only: reads an uploaded resume and drafts the whole profile from it (contact
// details, roles, level, location, industries, languages, headline, summary,
// highlights, full profile). Nothing is stored here; the form fills in and the rep checks it.
export async function POST(req: Request) {
  const me = await currentStaff();
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const form = await req.formData();
  const file = form.get("resume");
  const letters = String(form.get("letters") ?? "");
  const lookingFor = String(form.get("looking_for") ?? "");
  const repTake = String(form.get("rep_take") ?? "").slice(0, 2000);
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ found: {}, note: "That file looks empty." });
  const kind = resumeKind(file);
  if (!kind) return NextResponse.json({ found: {}, note: "Resumes need to be a PDF, Word file or photo." });
  if (kind === "doc") return NextResponse.json({ found: {}, note: `Older Word files (.doc) can't be read automatically. Save it as a PDF and add it again. ${KEEP}` });
  const buf = Buffer.from(await file.arrayBuffer());
  let text = "";
  try {
    text = await resumeText(buf, kind);
  } catch {}
  if (!(await allow(`resume:${me.id ?? me.email}`, 20, 60))) return NextResponse.json({ found: text ? resumeBasics(text) : {}, note: "That's a lot of resumes in an hour. We filled in the contact details only." });
  try {
    const draft = await draftFromResume({ buf, kind, text }, { letters, lookingFor, repTake });
    return NextResponse.json({ found: draft, drafted: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logActivity("system", "resume_read_failed", { file: file.name, error: msg });
    // Fall back to the basics we can read without the AI.
    return NextResponse.json({ found: text ? resumeBasics(text) : {}, note: `We couldn't draft the profile from this resume right now, so only the contact details were filled in. ${KEEP}` });
  }
}
