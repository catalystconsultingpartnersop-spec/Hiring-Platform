-- Languages a candidate speaks fluently, shown to business owners on their profile.
alter table candidates add column if not exists languages text[] not null default '{}';
notify pgrst, 'reload schema';
