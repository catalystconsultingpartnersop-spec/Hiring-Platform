import type { FeeTier, PublicCandidate } from "./db";

export function money(cents: number | null | undefined) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    cents / 100,
  );
}

export function salaryRange(min: number | null, max: number | null) {
  const k = (n: number) => `$${Math.round(n / 1000)}k`;
  if (min && max) return `${k(min)}–${k(max)}`;
  if (min) return `from ${k(min)}`;
  if (max) return `up to ${k(max)}`;
  return null;
}

// A short public reference, e.g. "C-3F2A9B", so owners and Heshy can talk about
// a candidate without using their name.
export function refCode(id: string) {
  return `C-${id.replace(/-/g, "").slice(-6).toUpperCase()}`;
}

export const LEVEL_LABEL: Record<string, string> = {
  beginner: "Beginner with potential",
  experienced: "Experienced",
  senior: "Senior",
};

export const WORK_MODE_LABEL: Record<string, string> = {
  "on-site": "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
  flexible: "Flexible",
};

// The flat fee for a candidate: their own override if set, otherwise the tier
// that matches their expected salary. Null means "set by hand" and not set yet.
export function feeFor(c: Pick<PublicCandidate, "fee_override_cents" | "salary_min" | "salary_max">, tiers: FeeTier[]) {
  if (c.fee_override_cents != null) return c.fee_override_cents;
  const salary = c.salary_max ?? c.salary_min;
  if (salary == null) {
    const first = [...tiers].sort((a, b) => a.sort - b.sort)[0];
    return first?.fee_cents ?? null;
  }
  const sorted = [...tiers].sort((a, b) => a.sort - b.sort);
  const tier = sorted.find((t) => t.max_salary == null || salary <= t.max_salary);
  return tier?.fee_cents ?? null;
}

export function dateShort(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function lines(text: string | null | undefined) {
  return (text ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function siteUrl() {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function brandName() {
  return process.env.NEXT_PUBLIC_BRAND_NAME || "Talent Catalog";
}

// How candidates and owners can reach a person.
export function contactPhone() {
  return process.env.CONTACT_PHONE || "917-374-7950";
}

export function contactPhoneHref() {
  return `+1${contactPhone().replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "")}`;
}

export function contactEmail() {
  return process.env.ADMIN_EMAIL || "";
}
