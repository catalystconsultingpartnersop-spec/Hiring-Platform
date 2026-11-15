"use server";

import { logActivity } from "@/lib/db";
import { sentBy } from "@/lib/shareKit";
import { allow, visitor } from "@/lib/throttle";

// Where owners go on the site, counted by us (no cookies, no names): each step
// is logged with a one-way visitor code, so the dashboard can show how many
// people reached each step and where they stopped.
const STEPS = ["home", "talk", "browse_click", "browse", "candidate", "form_started", "help_opened", "meet"] as const;
export type Step = (typeof STEPS)[number];

export async function markStep(step: Step) {
  try {
    if (!STEPS.includes(step)) return;
    if (!(await allow("funnel", 60, 60))) return;
    await logActivity("public", "funnel", { step, v: await visitor(), ref: (await sentBy()) ?? undefined });
  } catch {
    /* counting must never get in a visitor's way */
  }
}
