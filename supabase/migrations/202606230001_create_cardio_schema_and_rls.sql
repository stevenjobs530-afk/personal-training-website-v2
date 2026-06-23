-- Stage 5: Aerobic / cardio logging schema and RLS.
-- This keeps cardio separate from weight-training workout_sets.

begin;

create table public.cardio_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  default_distance_unit text not null default 'km',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cardio_exercises_name_not_blank check (length(btrim(name)) > 0),
  constraint cardio_exercises_category_check check (
    category in (
      'treadmill_running',
      'indoor_walking',
      'incline_walking',
      'stair_climber',
      'elliptical',
      'cycling',
      'rowing',
      'outdoor_running',
      'outdoor_walking',
      'other'
    )
  ),
  constraint cardio_exercises_default_distance_unit_check check (
    default_distance_unit in ('km', 'mi')
  )
);

create table public.cardio_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cardio_exercise_id uuid not null references public.cardio_exercises(id) on delete restrict,
  cardio_date date not null,
  duration_seconds integer not null,
  distance_value numeric(8, 2),
  distance_unit text not null,
  calories integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cardio_entries_duration_positive check (duration_seconds > 0),
  constraint cardio_entries_distance_nonnegative check (
    distance_value is null or distance_value >= 0
  ),
  constraint cardio_entries_distance_unit_check check (distance_unit in ('km', 'mi')),
  constraint cardio_entries_calories_nonnegative check (
    calories is null or calories >= 0
  )
);

comment on table public.cardio_exercises is
  'User-owned aerobic/cardio exercise names and categories.';
comment on table public.cardio_entries is
  'User-owned aerobic/cardio records measured by duration, distance, and optional calories.';

create unique index cardio_exercises_user_name_unique
  on public.cardio_exercises (user_id, lower(btrim(name)));

create index cardio_exercises_user_category_idx
  on public.cardio_exercises (user_id, category, name);

create index cardio_entries_user_date_idx
  on public.cardio_entries (user_id, cardio_date desc, created_at desc);

create index cardio_entries_exercise_id_idx
  on public.cardio_entries (cardio_exercise_id);

create trigger cardio_exercises_set_updated_at
before update on public.cardio_exercises
for each row execute function public.set_updated_at();

create trigger cardio_entries_set_updated_at
before update on public.cardio_entries
for each row execute function public.set_updated_at();

create or replace function public.validate_cardio_entry_ownership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.cardio_exercises
    where id = new.cardio_exercise_id
      and user_id = new.user_id
  ) then
    raise exception 'cardio_entry cardio_exercise_id must belong to the same user_id'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger cardio_entries_validate_ownership
before insert or update of user_id, cardio_exercise_id
on public.cardio_entries
for each row execute function public.validate_cardio_entry_ownership();

revoke execute on function public.validate_cardio_entry_ownership()
from public, anon, authenticated;

alter table public.cardio_exercises enable row level security;
alter table public.cardio_entries enable row level security;

revoke all on table
  public.cardio_exercises,
  public.cardio_entries
from anon;

grant usage on schema public to authenticated;

grant select, insert, update, delete on table
  public.cardio_exercises,
  public.cardio_entries
to authenticated;

revoke truncate, references, trigger on table
  public.cardio_exercises,
  public.cardio_entries
from authenticated;

create policy cardio_exercises_select_own
on public.cardio_exercises
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy cardio_exercises_insert_own
on public.cardio_exercises
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy cardio_exercises_update_own
on public.cardio_exercises
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy cardio_exercises_delete_own
on public.cardio_exercises
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy cardio_entries_select_own
on public.cardio_entries
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy cardio_entries_insert_own
on public.cardio_entries
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy cardio_entries_update_own
on public.cardio_entries
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy cardio_entries_delete_own
on public.cardio_entries
for delete
to authenticated
using ((select auth.uid()) = user_id);

commit;
