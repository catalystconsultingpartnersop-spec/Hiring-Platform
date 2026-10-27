-- Card on file: owners add a card when they sign, and the fee is charged to it.
alter table owners add column if not exists stripe_customer_id text;
alter table owners add column if not exists card_pm text;
alter table owners add column if not exists card_label text;

alter table unlocks add column if not exists card_pm text;
alter table unlocks add column if not exists card_label text;
alter table unlocks add column if not exists confirmed_at timestamptz;
-- Agreements signed before this change stay unlocked.
update unlocks set confirmed_at = signed_at where confirmed_at is null and signed_at < now();
