import { after } from "next/server";
import { db } from "./db";
import { fillWorkingGenius } from "./readAssessment";

// A candidate's Working Genius results (PDF or photo), kept with their resume.
// Only our team ever sees it.
export async function saveAssessmentFile(candidateId: string, file: File): Promise<string | null> {
  const n = file.name.toLowerCase();
  const ext =
    file.type === "application/pdf" || n.endsWith(".pdf")
      ? "pdf"
      : file.type === "image/png" || n.endsWith(".png")
        ? "png"
        : file.type.startsWith("image/") || /\.(jpe?g|heic)$/.test(n)
          ? "jpg"
          : null;
  if (!ext) return "Your results need to be a PDF or a photo.";
  if (file.size > 4.3 * 1024 * 1024) return "That file is over 4 MB. Try a smaller PDF, or a photo of your results.";
  const path = `${candidateId}/assessment.${ext}`;
  const type = ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : "image/jpeg";
  const { error } = await db().storage.from("resumes").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: type, upsert: true });
  if (error) return "The upload didn't go through. Try again.";
  await db().from("candidates").update({ assessment_path: path }).eq("id", candidateId);
  // Read their result from the report once the page has answered, so they aren't kept waiting.
  after(() => fillWorkingGenius(candidateId).catch(() => null));
  return null;
}
