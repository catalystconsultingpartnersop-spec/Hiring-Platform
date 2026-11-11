import { randomBytes } from "crypto";
import { db } from "./db";
import { refSlug } from "./shareKit";
import { siteUrl } from "./format";
import { getSetting, setSetting } from "./settings";

// Referral partners: anyone (not just reps) who sends business owners to the site.
// They sign up on /refer, get their own link (?r=<code>), and earn the same 5%
// finder's share a rep would when an owner who came through it hires.
// Kept in app_settings, no new tables. The link and the 90-day cookie are the
// same ones reps use.

export type Referrer = { code: string; token: string; name: string; email: string; phone: string; pay: string; created_at: string; off?: boolean };
const KEY = "referrers";

export async function allReferrers(): Promise<Record<string, Referrer>> {
  return getSetting<Record<string, Referrer>>(KEY, {});
}

export const isReferrerCode = (code: string | null | undefined) => !!code && /^[a-z0-9]+-[a-z0-9]{3}$/.test(code);

export async function referrerByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(token)) return null;
  return Object.values(await allReferrers()).find((r) => r.token === token) ?? null;
}

// Sign up, or find the existing sign-up for the same email (so nobody gets two links).
export async function addReferrer(o: { name: string; email: string; phone: string; pay: string }): Promise<{ r: Referrer; existed: boolean }> {
  const all = await allReferrers();
  const same = Object.values(all).find((r) => r.email === o.email.toLowerCase());
  if (same) return { r: same, existed: true };
  const first = refSlug(o.name.split(" ")[0]).replace(/-/g, "").slice(0, 14) || "friend";
  let code = "";
  do code = `${first}-${randomBytes(2).toString("hex").slice(0, 3)}`;
  while (all[code]);
  const r: Referrer = { code, token: randomBytes(18).toString("base64url"), name: o.name, email: o.email.toLowerCase(), phone: o.phone, pay: o.pay, created_at: new Date().toISOString() };
  all[code] = r;
  await setSetting(KEY, all);
  return { r, existed: false };
}

export async function setReferrerOff(code: string, off: boolean) {
  const all = await allReferrers();
  if (!all[code]) return;
  all[code].off = off;
  await setSetting(KEY, all);
}

// Business owners who signed up through this person's link.
export async function ownersReferredBy(code: string) {
  const { data } = await db().from("owners").select("id, created_at").eq("referred_by", code).order("created_at", { ascending: true });
  return (data ?? []) as { id: string; created_at: string }[];
}

export const referLink = (r: Referrer) => `${siteUrl()}/?r=${r.code}`;
