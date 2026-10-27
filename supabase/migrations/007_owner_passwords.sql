-- Owners can sign in with a password.
alter table owners add column if not exists password_hash text;
