-- The path from "unlocked" to "hired": calls and meetings the client offers
-- times for, both sides' feedback, and reference requests.
create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  unlock_id uuid not null references unlocks(id) on delete cascade,
  kind text not null check (kind in ('call', 'meeting')),
  mode text not null check (mode in ('phone', 'video', 'in_person')),
  place text,                               -- video link or address
  slots jsonb not null default '[]'::jsonb, -- start times the client offered (ISO)
  minutes integer not null default 30,
  note text,
  time_zone text,                           -- the client's time zone
  status text not null default 'proposed'
    check (status in ('proposed', 'booked', 'declined', 'cancelled')),
  starts_at timestamptz,
  owner_verdict text check (owner_verdict in ('yes', 'no')),
  candidate_verdict text check (candidate_verdict in ('yes', 'no')),
  candidate_note text,                      -- e.g. "none of these times work"
  asked_feedback_at timestamptz,
  nudged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists meetings_unlock_idx on meetings (unlock_id);

create table if not exists reference_requests (
  id uuid primary key default gen_random_uuid(),
  unlock_id uuid not null references unlocks(id) on delete cascade,
  note text,
  refs jsonb,                               -- [{name, relation, phone, email}]
  given_at timestamptz,
  nudged_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reference_requests_unlock_idx on reference_requests (unlock_id);

-- The candidate can politely decline an employer.
alter table unlocks add column if not exists candidate_declined_at timestamptz;
alter table unlocks add column if not exists candidate_decline_note text;
-- When we last nudged the client to take the next step.
alter table unlocks add column if not exists owner_nudged_at timestamptz;

alter table meetings enable row level security;
alter table reference_requests enable row level security;
grant all on meetings, reference_requests to service_role;
revoke all on meetings, reference_requests from anon, authenticated;

-- Reps sign a short agreement before using the back office.
alter table staff add column if not exists agreement_signed_at timestamptz;
alter table staff add column if not exists agreement_name text;
alter table staff add column if not exists agreement_version text;
alter table staff add column if not exists agreement_text text;
alter table staff add column if not exists agreement_ip text;

-- A candidate can fit several kinds of roles and industries.
alter table candidates add column if not exists also_roles text[] not null default '{}';
alter table candidates add column if not exists also_industries text[] not null default '{}';

-- Each rep can have their own commission: a percent of the fee, or a flat amount per hire.
alter table staff add column if not exists commission_type text check (commission_type in ('percent', 'flat'));
alter table staff add column if not exists commission_value numeric;
alter table staff add column if not exists commission_note text;
alter table staff add column if not exists package_sent_at timestamptz;

-- "Contact us": requests for a reply or a callback, routed to the right person.
create table if not exists contact_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null default 'other' check (kind in ('hiring', 'work', 'other')),
  name text not null,
  email text not null,
  phone text,
  best_time text,
  message text,
  candidate_id uuid references candidates(id) on delete set null,
  owner_id uuid references owners(id) on delete set null,
  routed_to uuid[] not null default '{}',   -- staff who were notified
  status text not null default 'new' check (status in ('new', 'handled')),
  handled_by text,
  handled_at timestamptz
);
alter table contact_requests enable row level security;
grant all on contact_requests to service_role;
revoke all on contact_requests from anon, authenticated;

-- The partner gets anything without a more specific person (e.g. no rep).
alter table staff add column if not exists is_partner boolean not null default false;

-- The candidate's Working Genius report, for the team only.
alter table candidates add column if not exists assessment_path text;
