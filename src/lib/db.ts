import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-only database client. Uses the secret service key, so it must never be
// imported into a client component.
let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable.");
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

// Columns that are safe to show on an anonymous card. Anything not listed here
// (name, email, phone, resume, full profile, notes) stays private.
export const PUBLIC_CANDIDATE_COLUMNS =
  "id, status, headline, role_category, industry, level, location_region, work_mode, salary_min, salary_max, strengths, working_genius, summary, highlights, fee_override_cents, listed_at";

export type PublicCandidate = {
  id: string;
  status: string;
  headline: string | null;
  role_category: string | null;
  industry: string | null;
  level: "beginner" | "experienced" | "senior" | null;
  location_region: string | null;
  work_mode: "on-site" | "hybrid" | "remote" | "flexible" | null;
  salary_min: number | null;
  salary_max: number | null;
  strengths: string[];
  working_genius: string | null;
  summary: string | null;
  highlights: string[];
  fee_override_cents: number | null;
  listed_at: string | null;
};

export type Candidate = PublicCandidate & {
  full_name: string;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
  resume_path: string | null;
  full_profile: string | null;
  never_show_to: string | null;
  application: Record<string, string>;
  consent_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FeeTier = { id: string; max_salary: number | null; fee_cents: number | null; sort: number };

export type Owner = {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  phone: string | null;
};

export type Unlock = {
  id: string;
  owner_id: string;
  candidate_id: string;
  signed_name: string;
  agreement_version: string;
  agreement_text: string;
  fee_cents: number | null;
  signed_at: string;
};

export type Hire = {
  id: string;
  unlock_id: string;
  amount_cents: number;
  status: "pending" | "paid" | "refunded" | "hired";
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  created_at: string;
  paid_at: string | null;
  refunded_at: string | null;
  hired_at: string | null;
};

export async function logActivity(actor: string, action: string, details: Record<string, unknown> = {}) {
  try {
    await db().from("activity_log").insert({ actor, action, details });
  } catch (e) {
    console.error("activity log failed", e);
  }
}
