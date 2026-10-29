-- The candidate's own page: profile view counts and pausing their own profile.
alter table candidates add column if not exists profile_views integer not null default 0;
alter table candidates add column if not exists self_paused_at timestamptz;

create or replace function bump_profile_view(cid uuid) returns void
language sql security definer set search_path = public as $$
  update candidates set profile_views = profile_views + 1 where id = cid and status = 'listed';
$$;
revoke all on function bump_profile_view(uuid) from public, anon, authenticated;
grant execute on function bump_profile_view(uuid) to service_role;
