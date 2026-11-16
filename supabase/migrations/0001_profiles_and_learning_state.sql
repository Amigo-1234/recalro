-- Recalro's first Supabase schema: one private profile and one private state
-- document per authenticated learner. Keep service-role keys server-only.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  onboarding jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_app_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_app_state enable row level security;

revoke all on table public.profiles from anon, public;
revoke all on table public.user_app_state from anon, public;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.user_app_state to authenticated;

drop policy if exists "Learners can read their own profile" on public.profiles;
drop policy if exists "Learners can create their own profile" on public.profiles;
drop policy if exists "Learners can update their own profile" on public.profiles;
drop policy if exists "Learners can read their own app state" on public.user_app_state;
drop policy if exists "Learners can create their own app state" on public.user_app_state;
drop policy if exists "Learners can update their own app state" on public.user_app_state;

create policy "Learners can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Learners can create their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "Learners can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Learners can read their own app state"
  on public.user_app_state for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Learners can create their own app state"
  on public.user_app_state for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Learners can update their own app state"
  on public.user_app_state for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
