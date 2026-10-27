-- Onboarding calls: reps set weekly hours, candidates book 45-minute video calls.
-- Paste this whole file into Supabase: SQL Editor -> New query -> Run.
-- Safe to run more than once.

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
