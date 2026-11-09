import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { summaryPdf } from "@/lib/ownerPacket";
import { canViewCandidate } from "@/lib/reps";
import { currentOwner, currentStaff } from "@/lib/session";

export const runtime = "nodejs";

// The one-page candidate summary, for the team or an owner who has signed for them.
export async function GET(_req: Request, ctx: RouteContext<"/api/summary/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const me = await currentStaff();
  let allowed = !!me && (await canViewCandidate(me));
  if (!allowed) {
    const owner = await currentOwner();
    if (owner) {
      const { data } = await db().from("unlocks").select("id").eq("owner_id", owner.id).eq("candidate_id", id).not("confirmed_at", "is", null).maybeSingle();
      allowed = !!data;
    }
  }
  if (!allowed) return new NextResponse("Not allowed", { status: 403 });
  const pdf = await summaryPdf(id);
  if (!pdf) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(pdf.content), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.filename}"; filename*=UTF-8''${encodeURIComponent(pdf.filename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
