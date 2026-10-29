-- Simple per-visitor limits on public forms (applications, contact, sign-up),
-- so bots can't flood the site or burn through the email allowance.
create table if not exists throttle (
  bucket text not null,
  who text not null,
  at timestamptz not null default now()
);
create index if not exists throttle_lookup_idx on throttle (bucket, who, at desc);
alter table throttle enable row level security;
