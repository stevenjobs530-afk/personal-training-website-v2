begin;

-- Preserve unknown legacy Setline data while narrowing unsafe API access.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;

  if to_regprocedure('public.setline_touch_updated_at()') is not null then
    execute 'alter function public.setline_touch_updated_at() set search_path = public';
    execute 'revoke execute on function public.setline_touch_updated_at() from public, anon, authenticated';
  end if;

  if to_regclass('public.setline_user_data') is not null then
    execute 'revoke all on table public.setline_user_data from anon';
    execute 'revoke truncate, references, trigger on table public.setline_user_data from authenticated';
    execute 'grant select, insert, update, delete on table public.setline_user_data to authenticated';
  end if;
end;
$$;

create or replace function public.delete_my_training_history(confirmation_text text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  deleted_workout_sets integer := 0;
  deleted_workout_sessions integer := 0;
  deleted_cardio_entries integer := 0;
  deleted_rest_days integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if confirmation_text <> 'DELETE ALL HISTORY' then
    raise exception 'Exact deletion confirmation is required' using errcode = '22023';
  end if;

  delete from public.workout_sets where user_id = current_user_id;
  get diagnostics deleted_workout_sets = row_count;
  delete from public.workout_sessions where user_id = current_user_id;
  get diagnostics deleted_workout_sessions = row_count;
  delete from public.cardio_entries where user_id = current_user_id;
  get diagnostics deleted_cardio_entries = row_count;
  delete from public.rest_days where user_id = current_user_id;
  get diagnostics deleted_rest_days = row_count;

  return jsonb_build_object(
    'workout_sets', deleted_workout_sets,
    'workout_sessions', deleted_workout_sessions,
    'cardio_entries', deleted_cardio_entries,
    'rest_days', deleted_rest_days
  );
end;
$$;

revoke all on function public.delete_my_training_history(text) from public, anon, authenticated;
grant execute on function public.delete_my_training_history(text) to authenticated;

commit;
