-- Shortlists for signed-in owners, so we can tell them when someone they saved is hired.
create table if not exists shortlists (
  owner_id uuid not null references owners(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  created_at timestamptz not null default now(),
  told_at timestamptz,
  primary key (owner_id, candidate_id)
);
create index if not exists shortlists_candidate_idx on shortlists (candidate_id);
alter table shortlists enable row level security;
