import { tagReferral } from "@/lib/shareKit";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db, logActivity } from "@/lib/db";
import { siteUrl } from "@/lib/format";

import { googleProfile } from "@/lib/google";
import { safeNext, startOwnerSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const jar = await cookies();
  const raw = jar.get("hp_google")?.value;
  jar.delete({ name: "hp_google", path: "/auth/google" });
  const fail = (why: string) => NextResponse.redirect(`${siteUrl()}/login?error=${why}`);

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (req.nextUrl.searchParams.get("error")) return fail("google-cancelled");
  if (!raw || !code || !state) return fail("google");

  let saved: { state: string; verifier: string; next: string };
  try {
    saved = JSON.parse(raw);
  } catch {
    return fail("google");
  }
  if (saved.state !== state) return fail("google");

  try {
    const profile = await googleProfile(code, saved.verifier);
    const now = new Date().toISOString();
    const { data: existing } = await db().from("owners").select("id, full_name, company").eq("email", profile.email).maybeSingle();
    let owner = existing;
    if (!owner) {
      const { data, error } = await db()
        .from("owners")
        .insert({ email: profile.email, full_name: profile.name, last_login_at: now })
        .select("id, full_name, company")
        .single();
      if (error) throw error;
      owner = data;
      await tagReferral(data.id);
    } else {
      await db()
        .from("owners")
        .update({ last_login_at: now, ...(owner.full_name ? {} : { full_name: profile.name }) })
        .eq("id", owner.id);
    }
    await startOwnerSession(owner!.id);
    await logActivity(`owner:${profile.email}`, "signed_in_google");
    const next = safeNext(saved.next);
    if (!owner!.company) return NextResponse.redirect(`${siteUrl()}/account/setup?next=${encodeURIComponent(next)}`);
    return NextResponse.redirect(`${siteUrl()}${next}`);
  } catch (e) {
    console.error("google sign-in failed", e);
    return fail("google");
  }
}
