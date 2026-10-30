-- The candidate promise (signed before a profile goes live), check-ins, and
-- candidates' own reports that they were hired.
alter table candidates add column if not exists promise_signed_at timestamptz;
alter table candidates add column if not exists promise_name text;
alter table candidates add column if not exists promise_requested_at timestamptz;
alter table candidates add column if not exists list_on_sign boolean not null default false;
alter table candidates add column if not exists checkin_sent_at timestamptz;
alter table candidates add column if not exists last_checkin_at timestamptz;

create table if not exists hire_reports (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  employer text not null,
  unlock_id uuid references unlocks(id) on delete set null,
  start_date text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists hire_reports_candidate_idx on hire_reports (candidate_id);
alter table hire_reports enable row level security;
grant all on table hire_reports to service_role;
