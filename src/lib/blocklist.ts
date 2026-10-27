import { db } from "./db";

// "Never show me to these companies": a candidate lists companies (their
// current employer, a place they had a bad experience). Owners whose company
// name or work email matches one of them can't see or unlock that candidate.
// It's best effort: someone signing up with a personal email won't be caught.

const SUFFIXES = /\b(the|llc|l\.l\.c|inc|incorporated|co|corp|corporation|company|ltd|limited|group|holdings|and|&)\b/g;
const PERSONAL_DOMAINS = new Set([
  "gmail", "googlemail", "yahoo", "outlook", "hotmail", "live", "msn", "icloud", "me", "mac", "aol",
  "protonmail", "proton", "gmx", "mail", "zoho", "yandex", "comcast", "verizon", "optonline", "att", "walla", "netvision",
]);

export function normalizeCompany(s: string) {
  return s.toLowerCase().replace(SUFFIXES, " ").replace(/[^a-z0-9]/g, "");
}

// "boss@mail.acmesupply.com" -> "acmesupply"; personal email providers -> null
export function emailCompany(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  const labels = domain.split(".").filter(Boolean);
  if (labels.length < 2) return null;
  // handle two-part endings like .co.il / .co.uk
  const core = labels.length >= 3 && ["co", "com", "org", "net", "ac"].includes(labels.at(-2)!) ? labels.at(-3)! : labels.at(-2)!;
  return PERSONAL_DOMAINS.has(core) ? null : normalizeCompany(core);
}

function entries(neverShowTo: string | null | undefined) {
  return (neverShowTo ?? "")
    .split(/[\n,;]/)
    .map((e) => e.trim())
    .filter(Boolean)
    .map((e) => (e.includes(".") && !e.includes(" ") ? emailCompany(`x@${e.replace(/^https?:\/\//, "").replace(/^www\./, "")}`) ?? "" : normalizeCompany(e)))
    .filter((e) => e.length >= 3);
}

function similar(a: string, b: string) {
  if (a.length < 3 || b.length < 3) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function isBlockedFor(
  neverShowTo: string | null | undefined,
  owner: { company?: string | null; email?: string | null } | null,
) {
  if (!owner) return false;
  const list = entries(neverShowTo);
  if (!list.length) return false;
  const company = normalizeCompany(owner.company ?? "");
  const fromEmail = owner.email ? emailCompany(owner.email) : null;
  return list.some((e) => similar(e, company) || (fromEmail ? similar(e, fromEmail) : false));
}

// Ids of listed candidates this owner shouldn't see.
export async function blockedIdsFor(owner: { company?: string | null; email?: string | null } | null) {
  if (!owner) return new Set<string>();
  try {
    const { data } = await db()
      .from("candidates")
      .select("id, never_show_to")
      .eq("status", "listed")
      .not("never_show_to", "is", null);
    return new Set((data ?? []).filter((r) => isBlockedFor(r.never_show_to, owner)).map((r) => r.id as string));
  } catch {
    return new Set<string>();
  }
}
