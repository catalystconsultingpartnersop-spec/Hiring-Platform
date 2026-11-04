import { NextResponse } from "next/server";
import { gatherSources } from "@/lib/cleanResume";
import { draftOwnerPage } from "@/lib/ownerPage";
import { draftFromResume } from "@/lib/resumeDraft";
import { requireAdmin } from "@/lib/session";

export const maxDuration = 60;

// Admin only: drafts a candidate's public wording (headline, summary, highlights) from
// their resume on file, and their owner page, without saving anything. To check it first.
export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const take = url.searchParams.get("take");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const g = await gatherSources(id);
  if (!g) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const file = g.pdf
    ? { buf: Buffer.from(g.pdf, "base64"), kind: "pdf" as const }
    : g.photo
      ? { buf: Buffer.from(g.photo.data, "base64"), kind: g.photo.type === "image/png" ? ("png" as const) : ("jpg" as const) }
      : g.text
        ? { buf: Buffer.alloc(0), kind: "docx" as const, text: g.text }
        : null;
  const resume = file ? await draftFromResume(file, { letters: g.c.working_genius, lookingFor: g.app.looking_for, repTake: take ?? g.app.rep_take }).catch((e) => ({ error: String(e) })) : null;
  const r = resume && !("error" in resume) ? resume : null;
  const owner = await draftOwnerPage(id, {
    rep_take: take ?? undefined,
    ...(r ? { headline: r.headline, summary: r.summary, highlights: r.highlights, role_category: r.role_category, also_roles: r.also_roles, industry: r.industry } : {}),
  });
  return NextResponse.json({ resume, owner });
}
