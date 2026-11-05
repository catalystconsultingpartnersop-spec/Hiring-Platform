import { NextResponse } from "next/server";
import { gatherSources } from "@/lib/cleanResume";
import { logActivity } from "@/lib/db";
import { resumeBasics, resumeKind, resumeText } from "@/lib/resume";
import { draftFromResume } from "@/lib/resumeDraft";
import { canEditCandidate } from "@/lib/reps";
import { currentStaff } from "@/lib/session";
import { allow } from "@/lib/throttle";

export const maxDuration = 60;
const KEEP = "It will still be attached when you save.";

// Staff only: drafts the whole profile from whatever we have: the rep's own words, the
// resume (just added, or the one on file) and their Strengths Assessment result. Any of
// them can be missing; it uses the rest. Nothing is stored here; the form fills in.
export async function POST(req: Request) {
  const me = await currentStaff();
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const form = await req.formData();
  const upload = form.get("resume");
  const letters = String(form.get("letters") ?? "");
  const lookingFor = String(form.get("looking_for") ?? "");
  const repTake = String(form.get("rep_take") ?? "").slice(0, 2000);
  const candidateId = String(form.get("candidate_id") ?? "");

  let file: { buf: Buffer; kind: "pdf" | "docx" | "jpg" | "png"; text?: string } | null = null;
  // Their call (recording, or our notes) ranks above the resume, so bring it in too.
  const mine = /^[0-9a-f-]{36}$/i.test(candidateId) && (await canEditCandidate(me, candidateId));
  const g = mine ? await gatherSources(candidateId).catch(() => null) : null;
  let text = "";
  let note: string | undefined;
  if (upload instanceof File && upload.size > 0) {
    const kind = resumeKind(upload);
    if (!kind) return NextResponse.json({ found: {}, note: "Resumes need to be a PDF, Word file or photo." });
    if (kind === "doc") note = `Older Word files (.doc) can't be read automatically. Save it as a PDF and add it again. ${KEEP}`;
    else {
      const buf = Buffer.from(await upload.arrayBuffer());
      text = await resumeText(buf, kind).catch(() => "");
      file = { buf, kind, text };
    }
  } else if (g) {
    // No new file: use the resume we already have for them.
    if (g?.pdf) file = { buf: Buffer.from(g.pdf, "base64"), kind: "pdf" };
    else if (g?.photo) file = { buf: Buffer.from(g.photo.data, "base64"), kind: g.photo.type === "image/png" ? "png" : "jpg" };
    else if (g?.text) file = { buf: Buffer.alloc(0), kind: "docx", text: g.text };
  }
  if (!file && !repTake.trim() && letters.length < 2 && !g?.call && !g?.notes)
    return NextResponse.json({ found: {}, note: note ?? "Add their resume, a few words about them, or their Strengths Assessment result, and we'll write the profile." });

  if (!(await allow(`resume:${me.id ?? me.email}`, 30, 60)))
    return NextResponse.json({ found: text ? resumeBasics(text) : {}, note: "That's a lot of drafts in an hour. Try again in a little while." });
  try {
    const draft = await draftFromResume(file, { letters, lookingFor, repTake, call: g?.call ?? null, notes: g?.notes ?? null });
    return NextResponse.json({ found: draft, drafted: true, note });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logActivity("system", "resume_read_failed", { error: msg });
    return NextResponse.json({ found: text ? resumeBasics(text) : {}, note: `We couldn't write the profile right now${text ? ", so only the contact details were filled in" : ""}. Try again in a minute.` });
  }
}
