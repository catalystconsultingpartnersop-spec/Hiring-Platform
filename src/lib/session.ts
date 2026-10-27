import { createHmac, timingSafeEqual, randomBytes, createHash, scryptSync } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, Owner } from "./db";

const ADMIN_COOKIE = "hp_admin";
const OWNER_COOKIE = "hp_owner";
const ADMIN_DAYS = 30;
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

// ---------- Staff (Heshy and reps) ----------
//
// Heshy (role "admin") sees everything. Reps (role "rep") add and edit
// candidates but never see fees, payments or refunds. Staff sign in with an
// emailed link; Heshy can also use the ADMIN_PASSWORD as a backup.

// owner: Heshy (the ADMIN_EMAIL). Always an admin, can't be switched off or
// demoted by anyone, and the only one who can make or remove other admins.
export type Staff = { id: string | null; email: string; name: string; role: "admin" | "rep"; owner: boolean };

export function isOwnerEmail(email: string | null | undefined) {
  const owner = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  return !!owner && (email ?? "").trim().toLowerCase() === owner;
}

export function checkAdminPassword(input: string) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(real).digest();
  return timingSafeEqual(a, b);
}

// subject is "admin" for the password login, or the staff member's id.
export async function startStaffSession(subject: string) {
  (await cookies()).set(ADMIN_COOKIE, makeToken(subject, ADMIN_DAYS), cookieOptions(ADMIN_DAYS));
}

export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function currentStaff(): Promise<Staff | null> {
  const subject = readToken((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!subject) return null;
  if (subject === "admin") {
    return { id: null, email: process.env.ADMIN_EMAIL ?? "", name: "Admin", role: "admin", owner: true };
  }
  try {
    const { data } = await db().from("staff").select("id, email, full_name, role, active").eq("id", subject).maybeSingle();
    if (!data) return null;
    const owner = isOwnerEmail(data.email);
    if (!data.active && !owner) return null;
    return { id: data.id, email: data.email, name: data.full_name || data.email, role: owner ? "admin" : data.role, owner };
  } catch {
    return null;
  }
}

// Any signed-in staff member (admin or rep).
export async function requireStaff(): Promise<Staff> {
  const s = await currentStaff();
  if (!s) redirect("/admin/login");
  return s;
}

// Admin only: money, fees, refunds, the team.
export async function requireAdmin(): Promise<Staff> {
  const s = await requireStaff();
  if (s.role !== "admin") redirect("/admin");
  return s;
}

export async function isAdmin() {
  return (await currentStaff())?.role === "admin";
}

export function staffActor(s: Staff) {
  return s.role === "admin" && !s.id ? "admin" : `staff:${s.email}`;
}

// ---------- Team passwords ----------

export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(pw, salt, 32).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

export function checkPasswordHash(pw: string, stored: string | null | undefined) {
  if (!stored) return false;
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const a = Buffer.from(scryptSync(pw, salt, 32).toString("base64url"));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---------- Signed links (no sign-in needed) ----------
// e.g. the link in a candidate's email that lets them reschedule their call.

export function signedToken(subject: string, days: number) {
  return makeToken(subject, days);
}

export function readSignedToken(token: string | null | undefined, prefix: string) {
  const subject = readToken(token ?? undefined);
  if (!subject || !subject.startsWith(prefix)) return null;
  return subject.slice(prefix.length);
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
  // "*" so the page keeps working even before newer columns exist.
  const { data } = await db().from("owners").select("*").eq("id", id).maybeSingle();
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
