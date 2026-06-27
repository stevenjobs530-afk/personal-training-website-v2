-- Apply aerobic/cardio logging to an existing Supabase project.
-- Safe to run after the base app tables already exist.

begin;

create table if not exists public.cardio_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  default_distance_unit text not null default 'km',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cardio_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cardio_exercise_id uuid not null references public.cardio_exercises(id) on delete restrict,
  cardio_date date not null,
  duration_seconds integer not null,
  distance_value numeric(8, 2),
  distance_unit text not null default 'km',
  calories integer not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cardio_exercises
  drop constraint if exists cardio_exercises_name_not_blank,
  drop constraint if exists cardio_exercises_category_check,
  drop constraint if exists cardio_exercises_default_distance_unit_check;

alter table public.cardio_exercises
  add constraint cardio_exercises_name_not_blank
    check (length(btrim(name)) > 0),
  add constraint cardio_exercises_category_check
    check (
      category in (
        'indoor_walking',
        'outdoor_walking',
        'indoor_running',
        'outdoor_running',
        'cycling',
        'elliptical'
      )
    ),
  add constraint cardio_exercises_default_distance_unit_check
    check (default_distance_unit in ('km', 'mi'));

alter table public.cardio_entries
  drop constraint if exists cardio_entries_duration_positive,
  drop constraint if exists cardio_entries_distance_nonnegative,
  drop constraint if exists cardio_entries_distance_positive,
  drop constraint if exists cardio_entries_distance_unit_check,
  drop constraint if exists cardio_entries_calories_nonnegative,
  drop constraint if exists cardio_entries_calories_positive;

alter table public.cardio_entries
  alter column distance_unit set default 'km',
  alter column calories set not null,
  alter column duration_seconds set not null,
  alter column cardio_date set not null,
  alter column user_id set not null,
  alter column cardio_exercise_id set not null,
  add constraint cardio_entries_duration_positive
    check (duration_seconds > 0),
  add constraint cardio_entries_distance_positive
    check (distance_value is null or distance_value > 0),
  add constraint cardio_entries_distance_unit_check
    check (distance_unit in ('km', 'mi')),
  add constraint cardio_entries_calories_positive
    check (calories > 0);

comment on table public.cardio_exercises is
  'User-owned aerobic/cardio exercise names and categories.';
comment on table public.cardio_entries is
  'User-owned aerobic/cardio records measured by duration, conditional distance, and kcal.';

create unique index if not exists cardio_exercises_user_name_unique
  on public.cardio_exercises (user_id, lower(btrim(name)));

create index if not exists cardio_exercises_user_category_idx
  on public.cardio_exercises (user_id, category, name);

create index if not exists cardio_entries_user_date_idx
  on public.cardio_entries (user_id, cardio_date desc, created_at desc);

create index if not exists cardio_entries_exercise_id_idx
  on public.cardio_entries (cardio_exercise_id);

drop trigger if exists cardio_exercises_set_updated_at on public.cardio_exercises;
create trigger cardio_exercises_set_updated_at
before update on public.cardio_exercises
for each row execute function public.set_updated_at();

drop trigger if exists cardio_entries_set_updated_at on public.cardio_entries;
create trigger cardio_entries_set_updated_at
before update on public.cardio_entries
for each row execute function public.set_updated_at();

create or replace function public.validate_cardio_entry_ownership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  exercise_category text;
begin
  select category
  into exercise_category
  from public.cardio_exercises
  where id = new.cardio_exercise_id
    and user_id = new.user_id;

  if exercise_category is null then
    raise exception 'cardio_entry cardio_exercise_id must belong to the same user_id'
      using errcode = '23514';
  end if;

  if exercise_category in (
    'indoor_walking',
    'outdoor_walking',
    'indoor_running',
    'outdoor_running'
  ) and (
    new.distance_value is null or
    new.distance_value <= 0
  ) then
    raise exception 'walking and running cardio entries need distance'
      using errcode = '23514';
  end if;

  if exercise_category in ('cycling', 'elliptical') then
    new.distance_value := null;
  end if;

  return new;
end;
$$;

drop trigger if exists cardio_entries_validate_ownership on public.cardio_entries;
create trigger cardio_entries_validate_ownership
before insert or update of user_id, cardio_exercise_id, distance_value
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

drop policy if exists cardio_exercises_select_own on public.cardio_exercises;
drop policy if exists cardio_exercises_insert_own on public.cardio_exercises;
drop policy if exists cardio_exercises_update_own on public.cardio_exercises;
drop policy if exists cardio_exercises_delete_own on public.cardio_exercises;
drop policy if exists cardio_entries_select_own on public.cardio_entries;
drop policy if exists cardio_entries_insert_own on public.cardio_entries;
drop policy if exists cardio_entries_update_own on public.cardio_entries;
drop policy if exists cardio_entries_delete_own on public.cardio_entries;

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

insert into public.cardio_exercises (user_id, name, category, default_distance_unit, notes)
select
  app_user.id,
  default_cardio.name,
  default_cardio.category,
  'km',
  default_cardio.notes
from auth.users as app_user
cross join (
  values
    ('Indoor Walking', 'indoor_walking', 'Distance and kcal are required.'),
    ('Outdoor Walking', 'outdoor_walking', 'Distance and kcal are required.'),
    ('Indoor Running', 'indoor_running', 'Distance and kcal are required.'),
    ('Outdoor Running', 'outdoor_running', 'Distance and kcal are required.'),
    ('Indoor Cycling', 'cycling', 'Record kcal for each session.'),
    ('Elliptical', 'elliptical', 'Record kcal for each session.')
) as default_cardio(name, category, notes)
on conflict do nothing;

commit;
