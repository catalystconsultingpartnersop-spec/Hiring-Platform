-- A client can step back from a candidate they signed for ("not a fit").
alter table unlocks add column if not exists passed_at timestamptz;
alter table unlocks add column if not exists pass_reason text;
