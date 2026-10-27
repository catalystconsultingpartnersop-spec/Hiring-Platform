import { NextResponse } from "next/server";
import { confirmCardSetup } from "@/lib/cards";
import { markPaidFromSession } from "@/lib/hires";
import { stripe } from "@/lib/stripe";

// Backup to the return-from-Stripe check: if an owner pays and closes the tab
// before coming back, Stripe still tells us here.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new NextResponse("Webhook not configured", { status: 501 });

  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  let event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch {
    return new NextResponse("Bad signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    try {
      if (event.data.object.mode === "setup") await confirmCardSetup(event.data.object.id);
      else await markPaidFromSession(event.data.object.id);
    } catch (e) {
      console.error("webhook handling failed", e);
      return new NextResponse("Error", { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
