import { NextResponse } from "next/server";
import { draftOwnerPage } from "@/lib/ownerPage";
import { requireAdmin } from "@/lib/session";

export const maxDuration = 60;

// Admin only: drafts a candidate's owner page without saving it, to check it first.
export async function GET(req: Request) {
  await requireAdmin();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  return NextResponse.json(await draftOwnerPage(id));
}
