-- Open positions (jobs) we know about. Private: never shown on the site, only used
-- to match candidates. Added by the team, by business owners, or found on the web later.
create table if not exists positions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text,
  location text,
  work_mode text,
  salary_min integer,
  salary_max integer,
  level text,
  role_category text,
  industry text,
  starts text,
  needs text,
  description text,
  source text not null default 'manual',
  owner_id uuid,
  contact_name text,
  contact_email text,
  url text,
  status text not null default 'open',
  added_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists positions_status_idx on positions (status);
alter table positions enable row level security;
notify pgrst, 'reload schema';
