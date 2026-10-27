-- Team members sign in with email and password.
-- Paste into Supabase: SQL Editor -> New query -> Run. Safe to run more than once.
alter table staff add column if not exists password_hash text;
