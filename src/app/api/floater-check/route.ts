import { NextResponse } from "next/server";
import { emailAdmin } from "@/lib/email";
import { findFloaters, floaterReportHtml } from "@/lib/floaters";
import { allow } from "@/lib/throttle";

export const dynamic = "force-dynamic";

// Emails the "no floaters" check to Heshy. Shows nothing here; at most a few times an hour.
export async function GET() {
  if (!(await allow("floater-check", 3, 60))) return NextResponse.json({ ok: false, error: "Try again later" }, { status: 429 });
  const f = await findFloaters();
  await emailAdmin(`Floater check: ${f.noRep.length} without a rep, ${f.noCall.length} without a call`, floaterReportHtml(f));
  return NextResponse.json({ ok: true });
}
