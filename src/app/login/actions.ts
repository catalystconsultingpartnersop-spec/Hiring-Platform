"use server";

import { allow, SLOW_DOWN } from "@/lib/throttle";

import { redirect } from "next/navigation";
import { owner as ownerMail } from "@/lib/emails";
import { db, logActivity } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/format";

import {
  checkPasswordHash,
  endOwnerSession,
  hashPassword,
  hashToken,
  newLoginToken,
  safeNext,
  startOwnerSession,
} from "@/lib/session";

export type LoginState = { sent?: string; error?: string; fields?: Record<string, string> };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function tooManyTries(email: string) {
  const since = new Date(Date.now() - 15 * 60e3).toISOString();
  const { count } = await db()
    .from("activity_log")
    .select("id", { count: "exact", head: true })
    .eq("actor", `owner:${email}`)
    .eq("action", "owner_login_failed")
    .gte("at", since);
  return (count ?? 0) >= 8;
}

async function signedIn(owner: { id: string; full_name: string | null; company: string | null }, email: string, next: string, how: string): Promise<never> {
  await db().from("owners").update({ last_login_at: new Date().toISOString() }).eq("id", owner.id);
  await startOwnerSession(owner.id);
  await logActivity(`owner:${email}`, "signed_in", { how });
  if (!owner.full_name || !owner.company) redirect(`/account/setup?next=${encodeURIComponent(next)}`);
  redirect(next);
}

// Email + password.
export async function signInWithPassword(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = safeNext(String(form.get("next") ?? ""));
  const fields = { email };
  if (!EMAIL.test(email)) return { error: "Enter a valid email address.", fields };
  if (await tooManyTries(email)) return { error: "Too many tries. Wait 15 minutes, or use “Forgot password?” below.", fields };
  if (!(await allow("owner_login", 30, 15))) return { error: SLOW_DOWN, fields };

  const { data: owner } = await db().from("owners").select("id, full_name, company, password_hash").eq("email", email).maybeSingle();
  if (!owner) return { error: "We don't have an account for that email. Create one below. It takes 30 seconds.", fields };
  if (!owner.password_hash) {
    // Older account made with an email link: one-time password setup.
    const r = await requestLink({}, form);
    if (r.error) return { ...r, fields };
    return {
      sent: email,
      fields,
      error: undefined,
    };
  }
  if (!checkPasswordHash(password, owner.password_hash)) {
    await logActivity(`owner:${email}`, "owner_login_failed");
    return { error: "That password isn't right. Try again, or use “Forgot password?” below.", fields };
  }
  return signedIn(owner, email, next, "password");
}

// New owner: one form, signed straight in. No email round-trip.
export async function createAccount(_prev: LoginState, form: FormData): Promise<LoginState> {
  const get = (k: string) => String(form.get(k) ?? "").trim();
  const email = get("email").toLowerCase();
  const full_name = get("full_name");
  const company = get("company");
  const phone = get("phone") || null;
  const password = String(form.get("password") ?? "");
  const next = safeNext(get("next"));
  const fields = { email, full_name, company, phone: phone ?? "" };
  if (full_name.length < 2) return { error: "Enter your full name.", fields };
  if (!(await allow("owner_signup", 10, 60))) return { error: SLOW_DOWN, fields };
  if (company.length < 2) return { error: "Enter your company name.", fields };
  if (!EMAIL.test(email)) return { error: "Enter a valid email address.", fields };
  if (password.length < 8) return { error: "Pick a password with at least 8 characters.", fields };

  const { data: existing } = await db().from("owners").select("id, password_hash").eq("email", email).maybeSingle();
  if (existing?.password_hash) return { error: "There's already an account for that email. Sign in instead.", fields };
  if (existing) {
    // Account exists from an email link: prove it's theirs once, then set the password.
    const r = await requestLink({}, form);
    return r.error ? { ...r, fields } : { sent: email, fields };
  }

  const { data: owner, error } = await db()
    .from("owners")
    .insert({ email, full_name, company, phone, password_hash: hashPassword(password) })
    .select("id, full_name, company")
    .single();
  if (error || !owner) return { error: "Something went wrong creating your account. Try again.", fields };
  await logActivity(`owner:${email}`, "owner_signed_up", { company });
  return signedIn(owner, email, next, "signup");
}

export async function requestLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(String(form.get("next") ?? ""));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  if (!(await allow("owner_link", 10, 60))) return { error: SLOW_DOWN };

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
  await sendEmail({ to: email, ...ownerMail.signInLink(link) });
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
    .eq("kind", "owner")
    .is("used_at", null)
    .gt("expires_at", now)
    .select("email, next_path")
    .maybeSingle();
  if (!data) redirect("/login?error=expired");

  const { data: owner, error } = await db()
    .from("owners")
    .upsert({ email: data.email, last_login_at: now }, { onConflict: "email" })
    .select("id, full_name, company, password_hash")
    .single();
  if (error || !owner) redirect("/login?error=invalid");

  await startOwnerSession(owner.id);
  await logActivity(`owner:${data.email}`, "signed_in");
  const next = safeNext(data.next_path);
  if (!owner.full_name || !owner.company || !owner.password_hash) redirect(`/account/setup?pw=1&next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function signOut() {
  await endOwnerSession();
  redirect("/");
}
