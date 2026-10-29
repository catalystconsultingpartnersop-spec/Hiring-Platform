import { NextResponse } from "next/server";
import { brandName, siteUrl } from "@/lib/format";
import { invitePdf } from "@/lib/invitePdf";
import { cleanInvite } from "@/lib/repInvite";
import { currentStaff } from "@/lib/session";

export const runtime = "nodejs";

// Builds the rep invitation PDF from whatever is in the editor. Admins only.
export async function POST(req: Request) {
  const me = await currentStaff();
  if (me?.role !== "admin") return new NextResponse("Not allowed", { status: 403 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.slice(0, 60) : "";
  const pdf = await invitePdf({ inv: cleanInvite(body?.invite), name, brand: brandName(), site: siteUrl() });
  const first = name.trim().split(/\s+/)[0] || "you";
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Invitation for ${first.replace(/[^\w -]/g, "")}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
