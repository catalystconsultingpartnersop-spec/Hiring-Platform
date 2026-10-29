-- Company expenses, so Finance can show what's left after costs.
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default current_date,
  what text not null,
  category text not null default 'Other',
  amount_cents integer not null check (amount_cents >= 0),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists expenses_spent_on_idx on expenses (spent_on desc);
alter table expenses enable row level security;
