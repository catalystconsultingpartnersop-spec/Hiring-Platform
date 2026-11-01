import { NextResponse, type NextRequest } from "next/server";
import { logActivity } from "@/lib/db";
import { finishConnect } from "@/lib/googleCalls";
import { requireAdmin } from "@/lib/session";

export async function GET(req: NextRequest) {
  const me = await requireAdmin();
  const p = req.nextUrl.searchParams;
  const back = (q: string) => {
    const res = NextResponse.redirect(new URL(`/admin/settings?${q}#calls`, req.url));
    res.cookies.delete("g_calls_state");
    return res;
  };
  if (!p.get("code") || p.get("state") !== req.cookies.get("g_calls_state")?.value) return back("google=failed");
  try {
    const email = await finishConnect(p.get("code")!);
    await logActivity(me.email, "google_calls_connected", { email });
    return back("google=connected");
  } catch (e) {
    return back(`google=failed&why=${encodeURIComponent((e as Error).message.slice(0, 200))}`);
  }
}
