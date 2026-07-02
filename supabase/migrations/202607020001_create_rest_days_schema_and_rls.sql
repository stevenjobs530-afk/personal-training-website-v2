-- Stage 6: Rest Day logging schema, conflict guards, and RLS.
-- Lets the owner log recovery days while keeping Rest Day dates separate from training dates.

begin;

alter table public.profiles
  add column if not exists last_seen_date date;

comment on column public.profiles.last_seen_date is
  'Last local calendar date the owner opened the app; used to backfill missed blank days as Rest Days.';

create table if not exists public.rest_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rest_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.rest_days is
  'User-owned rest/recovery day log, one row per user per date. Rest dates cannot also contain strength or cardio records.';

create unique index if not exists rest_days_user_date_unique
  on public.rest_days (user_id, rest_date);

drop trigger if exists rest_days_set_updated_at on public.rest_days;
create trigger rest_days_set_updated_at
before update on public.rest_days
for each row execute function public.set_updated_at();

create or replace function public.validate_rest_day_has_no_training()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.workout_sessions
    where user_id = new.user_id
      and workout_date = new.rest_date
  ) then
    raise exception 'rest day cannot be recorded on a date with strength training'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.cardio_entries
    where user_id = new.user_id
      and cardio_date = new.rest_date
  ) then
    raise exception 'rest day cannot be recorded on a date with cardio training'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists rest_days_validate_blank_date on public.rest_days;
create trigger rest_days_validate_blank_date
before insert or update of user_id, rest_date
on public.rest_days
for each row execute function public.validate_rest_day_has_no_training();

create or replace function public.validate_workout_session_not_rest_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.rest_days
    where user_id = new.user_id
      and rest_date = new.workout_date
  ) then
    raise exception 'workout session cannot be recorded on a Rest Day'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists workout_sessions_validate_not_rest_day on public.workout_sessions;
create trigger workout_sessions_validate_not_rest_day
before insert or update of user_id, workout_date
on public.workout_sessions
for each row execute function public.validate_workout_session_not_rest_day();

create or replace function public.validate_cardio_entry_not_rest_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.rest_days
    where user_id = new.user_id
      and rest_date = new.cardio_date
  ) then
    raise exception 'cardio entry cannot be recorded on a Rest Day'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists cardio_entries_validate_not_rest_day on public.cardio_entries;
create trigger cardio_entries_validate_not_rest_day
before insert or update of user_id, cardio_date
on public.cardio_entries
for each row execute function public.validate_cardio_entry_not_rest_day();

revoke execute on function
  public.validate_rest_day_has_no_training(),
  public.validate_workout_session_not_rest_day(),
  public.validate_cardio_entry_not_rest_day()
from public, anon, authenticated;

alter table public.rest_days enable row level security;

revoke all on table public.rest_days from anon;

grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.rest_days to authenticated;

revoke truncate, references, trigger on table public.rest_days from authenticated;

drop policy if exists rest_days_select_own on public.rest_days;
drop policy if exists rest_days_insert_own on public.rest_days;
drop policy if exists rest_days_update_own on public.rest_days;
drop policy if exists rest_days_delete_own on public.rest_days;

create policy rest_days_select_own
on public.rest_days
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy rest_days_insert_own
on public.rest_days
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy rest_days_update_own
on public.rest_days
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy rest_days_delete_own
on public.rest_days
for delete
to authenticated
using ((select auth.uid()) = user_id);

commit;
