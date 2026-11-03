import { NextResponse, type NextRequest } from "next/server";
import { logActivity } from "@/lib/db";
import { optOutOwner } from "@/lib/ownerMatches";
import { readSignedToken } from "@/lib/session";

// "Stop these emails" from a candidate-suggestion email.
export async function GET(req: NextRequest) {
  const id = readSignedToken(req.nextUrl.searchParams.get("t"), "ownerstop_");
  if (id) {
    await optOutOwner(id);
    await logActivity("system", "owner_suggestions_stopped", { owner_id: id });
  }
  return new NextResponse(
    `<!doctype html><meta name="viewport" content="width=device-width"><body style="font-family:system-ui,sans-serif;max-width:520px;margin:60px auto;padding:0 20px;color:#17213a"><h1 style="font-size:24px">Done.</h1><p>We won't email you candidate suggestions anymore. You can still browse anytime.</p><p><a href="/candidates">Browse candidates</a></p></body>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
