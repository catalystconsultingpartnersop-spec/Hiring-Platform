"use server";

import { redirect } from "next/navigation";
import { db, logActivity } from "@/lib/db";
import { escapeHtml, sendEmail } from "@/lib/email";
import { brandName, siteUrl } from "@/lib/format";
import { endOwnerSession, hashToken, newLoginToken, safeNext, startOwnerSession } from "@/lib/session";

export type LoginState = { sent?: string; error?: string };

export async function requestLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(String(form.get("next") ?? ""));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };

  // At most 5 links per email per hour.
  const since = new Date(Date.now() - 3600e3).toISOString();
  const { count } = await db()
    .from("login_tokens")
    .select("token_hash", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", since);
  if ((count ?? 0) >= 5) return { error: "Too many sign-in links requested. Wait an hour and try again." };

  const { token, hash } = newLoginToken();
  const { error } = await db()
    .from("login_tokens")
    .insert({ token_hash: hash, email, next_path: next, expires_at: new Date(Date.now() + 30 * 60e3).toISOString() });
  if (error) return { error: "Something went wrong. Try again." };

  const link = `${siteUrl()}/auth/verify?token=${token}`;
  await sendEmail({
    to: email,
    subject: `Your sign-in link for ${brandName()}`,
    html: `<p>Click below to sign in. The link works once and expires in 30 minutes.</p>
<p><a href="${link}" style="display:inline-block;background:#f2b300;color:#17213a;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Sign in to ${escapeHtml(brandName())}</a></p>
<p style="color:#4a5570;font-size:13px">If you didn't ask for this, ignore this email.</p>`,
  });
  return { sent: email };
}

export async function verifyLink(form: FormData) {
  const token = String(form.get("token") ?? "");
  if (!token) redirect("/login?error=invalid");
  const now = new Date().toISOString();

  // Mark the token used in the same step that checks it, so it can only work once.
  const { data } = await db()
    .from("login_tokens")
    .update({ used_at: now })
    .eq("token_hash", hashToken(token))
    .is("used_at", null)
    .gt("expires_at", now)
    .select("email, next_path")
    .maybeSingle();
  if (!data) redirect("/login?error=expired");

  const { data: owner, error } = await db()
    .from("owners")
    .upsert({ email: data.email, last_login_at: now }, { onConflict: "email" })
    .select("id, full_name, company")
    .single();
  if (error || !owner) redirect("/login?error=invalid");

  await startOwnerSession(owner.id);
  await logActivity(`owner:${data.email}`, "signed_in");
  const next = safeNext(data.next_path);
  if (!owner.full_name || !owner.company) redirect(`/account/setup?next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function signOut() {
  await endOwnerSession();
  redirect("/");
}
