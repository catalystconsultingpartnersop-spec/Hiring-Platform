import { createHmac, timingSafeEqual, randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, Owner } from "./db";

const ADMIN_COOKIE = "hp_admin";
const OWNER_COOKIE = "hp_owner";
const ADMIN_DAYS = 7;
const OWNER_DAYS = 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set to a random string of at least 32 characters.");
  return s;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function makeToken(subject: string, days: number) {
  const exp = Date.now() + days * 864e5;
  const body = `${subject}.${exp}`;
  return `${body}.${sign(body)}`;
}

function readToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [subject, exp, sig] = parts;
  const expected = sign(`${subject}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now()) return null;
  return subject;
}

const cookieOptions = (days: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: days * 86400,
});

// ---------- Admin ----------

export function checkAdminPassword(input: string) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(real).digest();
  return timingSafeEqual(a, b);
}

export async function startAdminSession() {
  (await cookies()).set(ADMIN_COOKIE, makeToken("admin", ADMIN_DAYS), cookieOptions(ADMIN_DAYS));
}

export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin() {
  return readToken((await cookies()).get(ADMIN_COOKIE)?.value) === "admin";
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

// ---------- Owners ----------

export async function startOwnerSession(ownerId: string) {
  (await cookies()).set(OWNER_COOKIE, makeToken(ownerId, OWNER_DAYS), cookieOptions(OWNER_DAYS));
}

export async function endOwnerSession() {
  (await cookies()).delete(OWNER_COOKIE);
}

export async function currentOwner(): Promise<Owner | null> {
  const id = readToken((await cookies()).get(OWNER_COOKIE)?.value);
  if (!id) return null;
  const { data } = await db().from("owners").select("id, email, full_name, company, phone").eq("id", id).maybeSingle();
  return (data as Owner) ?? null;
}

export async function requireOwner(nextPath: string): Promise<Owner> {
  const owner = await currentOwner();
  if (!owner) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (!owner.full_name || !owner.company) redirect(`/account/setup?next=${encodeURIComponent(nextPath)}`);
  return owner;
}

// ---------- One-time sign-in links ----------

export function newLoginToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Only allow redirects to paths on this site.
export function safeNext(next: string | null | undefined, fallback = "/account") {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
