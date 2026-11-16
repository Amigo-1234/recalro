-- Reserve usernames at account creation, including when email confirmation is on.
alter table public.profiles add column if not exists username text;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z][a-z0-9_]{2,23}$');

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username)) where username is not null;

create or replace function public.username_available(candidate text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select candidate ~ '^[a-z][a-z0-9_]{2,23}$'
    and not exists (
      select 1 from public.profiles
      where lower(username) = lower(candidate)
    );
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

create or replace function public.create_profile_on_signup()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, username, onboarding)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(lower(new.raw_user_meta_data ->> 'username'), ''),
    coalesce((new.raw_user_meta_data -> 'onboarding')::jsonb, '{}'::jsonb)
  ) on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.create_profile_on_signup() from public;
drop trigger if exists on_auth_user_created_recalro on auth.users;
create trigger on_auth_user_created_recalro
  after insert on auth.users
  for each row execute function public.create_profile_on_signup();
