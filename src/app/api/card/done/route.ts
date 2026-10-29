import { NextResponse } from "next/server";
import { confirmCardSetup } from "@/lib/cards";
import { siteUrl } from "@/lib/format";


// Owners land here after adding their card on Stripe.
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session_id") ?? "";
  let done: { candidateId: string } | null = null;
  try {
    if (sessionId.startsWith("cs_")) done = await confirmCardSetup(sessionId);
  } catch (e) {
    console.error("card setup confirm failed", e);
  }
  return NextResponse.redirect(done ? `${siteUrl()}/candidates/${done.candidateId}?unlocked=1` : `${siteUrl()}/account?card=failed`, 303);
}
