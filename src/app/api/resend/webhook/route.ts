import { handleResendEvent, verifyResendWebhook } from "@/lib/emailProblems";

// Resend tells us here when an email bounces, is blocked, or is delivered.
export async function POST(req: Request) {
  const body = await req.text();
  if (!verifyResendWebhook(body, req.headers)) return new Response("Bad signature", { status: 401 });
  try {
    await handleResendEvent(JSON.parse(body));
  } catch (e) {
    console.error("resend webhook failed", e);
  }
  return Response.json({ ok: true });
}
