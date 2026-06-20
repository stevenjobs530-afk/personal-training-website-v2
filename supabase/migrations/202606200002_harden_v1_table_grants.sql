-- Stage 2 live verification hardening:
-- keep Version 1 app table privileges limited to normal CRUD.

begin;

revoke truncate, references, trigger on table
  public.profiles,
  public.exercises,
  public.workout_sessions,
  public.workout_sets
from authenticated;

grant select, insert, update, delete on table
  public.profiles,
  public.exercises,
  public.workout_sessions,
  public.workout_sets
to authenticated;

commit;
