-- Stage 2.5: Version 1 personal training schema and RLS.
-- This file is intended for manual review before it is run in Supabase.
-- It creates no public signup, analytics, media, social, payment, or AI tables.

begin;

-- gen_random_uuid() is used for app-owned row identifiers.
create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercises_name_not_blank check (length(btrim(name)) > 0)
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  set_number integer not null,
  set_kind text not null,
  weight numeric(8, 2) not null,
  reps integer not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_sets_set_number_positive check (set_number > 0),
  constraint workout_sets_set_kind_check check (set_kind in ('warmup', 'working')),
  constraint workout_sets_weight_nonnegative check (weight >= 0),
  constraint workout_sets_reps_nonnegative check (reps >= 0),
  constraint workout_sets_unique_set_number_per_exercise unique (
    session_id,
    exercise_id,
    set_number
  )
);

comment on table public.profiles is
  'Private app profile data for the authenticated owner account.';
comment on table public.exercises is
  'User-owned exercise and machine names for workout logging.';
comment on table public.workout_sessions is
  'User-owned workout session headers by date.';
comment on table public.workout_sets is
  'User-owned warmup and working sets tied to a session and exercise.';

create unique index exercises_user_name_unique
  on public.exercises (user_id, lower(btrim(name)));

create index workout_sessions_user_date_idx
  on public.workout_sessions (user_id, workout_date desc);

create index workout_sets_user_id_idx
  on public.workout_sets (user_id);

create index workout_sets_session_id_idx
  on public.workout_sets (session_id);

create index workout_sets_exercise_id_idx
  on public.workout_sets (exercise_id);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger exercises_set_updated_at
before update on public.exercises
for each row execute function public.set_updated_at();

create trigger workout_sessions_set_updated_at
before update on public.workout_sessions
for each row execute function public.set_updated_at();

create trigger workout_sets_set_updated_at
before update on public.workout_sets
for each row execute function public.set_updated_at();

create or replace function public.validate_workout_set_ownership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.workout_sessions
    where id = new.session_id
      and user_id = new.user_id
  ) then
    raise exception 'workout_set session_id must belong to the same user_id'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.exercises
    where id = new.exercise_id
      and user_id = new.user_id
  ) then
    raise exception 'workout_set exercise_id must belong to the same user_id'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger workout_sets_validate_ownership
before insert or update of user_id, session_id, exercise_id
on public.workout_sets
for each row execute function public.validate_workout_set_ownership();

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.validate_workout_set_ownership() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sets enable row level security;

revoke all on table
  public.profiles,
  public.exercises,
  public.workout_sessions,
  public.workout_sets
from anon;

grant usage on schema public to authenticated;

grant select, insert, update, delete on table
  public.profiles,
  public.exercises,
  public.workout_sessions,
  public.workout_sets
to authenticated;

-- Profiles use id = auth.uid() because profiles.id is the auth.users.id.
create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy profiles_delete_own
on public.profiles
for delete
to authenticated
using ((select auth.uid()) = id);

-- User-owned tables use user_id = auth.uid().
create policy exercises_select_own
on public.exercises
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy exercises_insert_own
on public.exercises
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy exercises_update_own
on public.exercises
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy exercises_delete_own
on public.exercises
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy workout_sessions_select_own
on public.workout_sessions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy workout_sessions_insert_own
on public.workout_sessions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy workout_sessions_update_own
on public.workout_sessions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy workout_sessions_delete_own
on public.workout_sessions
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy workout_sets_select_own
on public.workout_sets
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy workout_sets_insert_own
on public.workout_sets
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy workout_sets_update_own
on public.workout_sets
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy workout_sets_delete_own
on public.workout_sets
for delete
to authenticated
using ((select auth.uid()) = user_id);

commit;
