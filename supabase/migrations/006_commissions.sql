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

-- Hires made before this: credit the rep who added the candidate.
update hires h set rep_id = c.added_by
from unlocks u join candidates c on c.id = u.candidate_id
where h.unlock_id = u.id and h.rep_id is null;
