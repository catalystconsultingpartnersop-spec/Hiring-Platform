-- Team logins: lets Heshy add reps who onboard candidates.
-- Paste this whole file into Supabase: SQL Editor -> New query -> Run.
-- Safe to run more than once.

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
