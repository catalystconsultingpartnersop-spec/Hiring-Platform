-- Hiring platform database schema
-- Paste this whole file into Supabase: SQL Editor -> New query -> Run.
-- Safe to run once on a fresh project.

create extension if not exists pgcrypto;

-- Fee tiers: the default flat fee for a candidate is picked by their expected salary.
create table if not exists fee_tiers (
  id uuid primary key default gen_random_uuid(),
  max_salary integer,            -- null = no upper limit (top tier)
  fee_cents integer,             -- null = "set by hand" for candidates in this tier
  sort integer not null default 0
);

insert into fee_tiers (max_salary, fee_cents, sort)
select * from (values (100000, 500000, 1), (200000, 1000000, 2), (null::integer, null::integer, 3)) v
where not exists (select 1 from fee_tiers);

-- Candidates. Public columns are shown on anonymous cards; private columns only after an owner signs.
create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'applied'
    check (status in ('applied', 'draft', 'listed', 'paused', 'hired', 'archived')),

  -- public (anonymous card)
  headline text,                 -- e.g. "Field sales closer for construction suppliers"
  role_category text,            -- e.g. "Sales", "Bookkeeping", "Executive assistant"
  industry text,
  level text check (level in ('beginner', 'experienced', 'senior') or level is null),
  location_region text,          -- broad only: "Northern New Jersey", "Jerusalem area"
  work_mode text check (work_mode in ('on-site', 'hybrid', 'remote', 'flexible') or work_mode is null),
  salary_min integer,
  salary_max integer,
  strengths text[] not null default '{}',   -- how they're wired, shown as highlights
  working_genius text,           -- e.g. "Invention, Galvanizing"
  summary text,                  -- the teaser paragraph
  highlights text[] not null default '{}',  -- short bullet points, never identifying
  fee_override_cents integer,    -- set to override the tier fee

  -- private (revealed after signing)
  full_name text not null,
  email text not null,
  phone text,
  linkedin_url text,
  resume_path text,              -- file in the private "resumes" storage bucket
  full_profile text,             -- the longer write-up owners see after unlocking
  never_show_to text,            -- companies that must never see this candidate

  -- what the candidate told us in their application
  application jsonb not null default '{}'::jsonb,
  consent_at timestamptz,
  admin_notes text,

  created_at timestamptz not null default now(),
  listed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists candidates_status_idx on candidates (status);

-- Business owners
create table if not exists owners (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  company text,
  phone text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- One-time sign-in links (only a hash of the token is stored)
create table if not exists login_tokens (
  token_hash text primary key,
  email text not null,
  next_path text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- An owner signing the agreement for one candidate
create table if not exists unlocks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id),
  candidate_id uuid not null references candidates(id),
  signed_name text not null,
  agreement_version text not null,
  agreement_text text not null,
  fee_cents integer,             -- the fee in force at signing
  ip text,
  user_agent text,
  signed_at timestamptz not null default now(),
  unique (owner_id, candidate_id)
);

-- "I'm hiring" payments
create table if not exists hires (
  id uuid primary key default gen_random_uuid(),
  unlock_id uuid not null references unlocks(id),
  amount_cents integer not null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'refunded', 'hired')),
  stripe_session_id text unique,
  stripe_payment_intent text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  refunded_at timestamptz,
  hired_at timestamptz
);

-- Everything that happens, for your records
create table if not exists activity_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor text not null,           -- 'admin', 'owner:<email>', 'candidate:<email>', 'system'
  action text not null,
  details jsonb not null default '{}'::jsonb
);

-- Lock every table down: the app talks to the database only from the server,
-- with the secret service key, so nothing is readable from a browser.
alter table fee_tiers enable row level security;
alter table candidates enable row level security;
alter table owners enable row level security;
alter table login_tokens enable row level security;
alter table unlocks enable row level security;
alter table hires enable row level security;
alter table activity_log enable row level security;

-- Private storage for resumes
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

-- Only the server's secret key can read or write. Browsers (anon / signed-in
-- Supabase users) get no access at all.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- ---------- Team (same as migrations/002_team.sql) ----------
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  role text not null default 'rep' check (role in ('admin', 'rep')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

alter table candidates add column if not exists added_by uuid references staff(id);
alter table login_tokens add column if not exists kind text not null default 'owner';

alter table staff enable row level security;
grant all on staff to service_role;
revoke all on staff from anon, authenticated;

-- ---------- Onboarding calls (same as migrations/003_onboarding_calls.sql) ----------
alter table staff add column if not exists meeting_link text;
alter table staff add column if not exists time_zone text not null default 'America/New_York';

create table if not exists staff_availability (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),  -- 0 = Sunday
  start_minute smallint not null check (start_minute between 0 and 1439),
  end_minute smallint not null check (end_minute between 1 and 1440)
);

create table if not exists onboarding_calls (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  staff_id uuid not null references staff(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'booked' check (status in ('booked', 'cancelled', 'done', 'no_show')),
  candidate_time_zone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A rep can never have two live bookings at the same start time.
create unique index if not exists onboarding_calls_no_double_booking
  on onboarding_calls (staff_id, starts_at) where status = 'booked';
create index if not exists onboarding_calls_starts_at on onboarding_calls (starts_at);

alter table staff_availability enable row level security;
alter table onboarding_calls enable row level security;
grant all on staff_availability, onboarding_calls to service_role;
revoke all on staff_availability, onboarding_calls from anon, authenticated;

-- ---------- Team passwords (same as migrations/004_team_passwords.sql) ----------
alter table staff add column if not exists password_hash text;

-- 005: card on file
-- Card on file: owners add a card when they sign, and the fee is charged to it.
alter table owners add column if not exists stripe_customer_id text;
alter table owners add column if not exists card_pm text;
alter table owners add column if not exists card_label text;

alter table unlocks add column if not exists card_pm text;
alter table unlocks add column if not exists card_label text;
alter table unlocks add column if not exists confirmed_at timestamptz;
-- (existing rows were grandfathered when this ran)

-- 006: commissions
-- Rep commissions on hires, and a small settings table.
alter table hires add column if not exists rep_id uuid references staff(id);
alter table hires add column if not exists commission_cents integer;   -- null = use the default rate
alter table hires add column if not exists commission_paid_at timestamptz;
alter table hires add column if not exists commission_note text;

create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table app_settings enable row level security;
grant all on app_settings to service_role;
revoke all on app_settings from anon, authenticated;


-- 007: owner passwords
alter table owners add column if not exists password_hash text;
