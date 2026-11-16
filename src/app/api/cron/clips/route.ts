import { NextResponse, type NextRequest } from "next/server";
import { makeWaitingClips } from "@/lib/clips";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Every 15 minutes: cut the 30-second clip and picture for one recorded call that doesn't have them yet.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  return NextResponse.json(await makeWaitingClips(1).catch((e) => ({ error: String((e as Error).message ?? e) })));
}
