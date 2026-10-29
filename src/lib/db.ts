import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-only database client. Uses the secret service key, so it must never be
// imported into a client component.
let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (client) return client;
  const problem = dbConfigProblem();
  if (problem) throw new Error(problem);
  client = createClient(supabaseUrl()!, process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

// Accept the Project URL however it was copied: with or without "/rest/v1" or a
// trailing slash.
function supabaseUrl() {
  const raw = process.env.SUPABASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "").replace(/\/rest\/v1$/, "").replace(/\/+$/, "");
}

// Plain-English description of what's wrong with the database settings, or null.
export function dbConfigProblem(): string | null {
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url) return "SUPABASE_URL is missing in Vercel.";
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url))
    return `SUPABASE_URL should look like https://abcdefgh.supabase.co, but it is "${url}".`;
  if (!key) return "SUPABASE_SERVICE_ROLE_KEY is missing in Vercel.";
  if (key.startsWith("sb_publishable_"))
    return "SUPABASE_SERVICE_ROLE_KEY is the publishable key. It needs the secret key (starts with sb_secret_).";
  if (key.startsWith("eyJ")) {
    try {
      const role = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role;
      if (role !== "service_role")
        return `SUPABASE_SERVICE_ROLE_KEY is the "${role}" key. It needs the secret / service_role key.`;
    } catch {
      return "SUPABASE_SERVICE_ROLE_KEY doesn't look like a valid key.";
    }
  } else if (!key.startsWith("sb_secret_")) {
    return "SUPABASE_SERVICE_ROLE_KEY doesn't look like a Supabase secret key (it should start with sb_secret_).";
  }
  return null;
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
  stripe_customer_id?: string | null;
  card_pm?: string | null; // saved card (Stripe payment method)
  card_label?: string | null; // e.g. "Visa ending 4242"
  password_hash?: string | null; // never send to the browser
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
  card_pm?: string | null;
  card_label?: string | null;
  ip?: string | null;
  confirmed_at?: string | null; // set once a card is on file; until then nothing is unlocked
  passed_at?: string | null; // the client said this candidate isn't a fit
  pass_reason?: string | null;
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
