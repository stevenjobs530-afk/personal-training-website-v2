# ROADMAP.md

Last updated: 2026-06-23

## Product Principle

Record first, analyze later.

Version 1 should make it fast and reliable to log workouts on an iPhone in the gym. Progress analysis is valuable only after clean workout data exists.

## Version 1 MVP

Version 1 should include:

- email/password login
- logout behavior
- reliable session persistence
- controlled account setup outside the app
- protected dashboard
- add exercises or machine names
- create workout sessions by date
- record workout sets
- mark each set as `warmup` or `working`
- record weight and reps
- add simple notes where useful
- view recent workout history
- record aerobic/cardio entries separately from strength sets
- mobile-friendly layout for iPhone
- responsive layout for iPad and macOS
- simple refresh/refetch behavior after changes

## Current Workflow Status

UX Rework 1-5 confirms the Version 1 workout entry flow is now structured enough for a future progress stage:

- `/workouts/new` creates a dated workout session and sends the owner to the session detail page for structured set entry.
- `/workouts/[sessionId]` starts with exercise selection, supports inline exercise creation, and records warmup/working sets under the selected exercise.
- Each saved set keeps `session_id`, `exercise_id`, `set_kind`, `weight`, `reps`, `set_number`, and optional notes.
- `/workouts` recent history reads sessions, sets, and exercises, then groups sets under each exercise name.
- Session notes and set notes remain optional context fields, not the primary place for structured workout data.

Do not add progress charts yet. The next progress stage can derive summaries from `workout_sets` joined to `workout_sessions` and `exercises` after owner logged-in workflow QA confirms live writes and refresh persistence.

Stage 5 adds an Aerobic / Cardio Logging MVP:

- `/cardio` shows recent cardio entries.
- `/cardio/new` records date, cardio exercise, category for new exercise names, duration, distance, distance unit, optional calories, and optional notes.
- Cardio data uses `cardio_exercises` and `cardio_entries` rather than `workout_sets`.
- Pace is display-only when duration and distance are available.
- This stage does not add charts, AI analysis, Realtime, social features, payments, public profiles, or advanced dashboards.

## Version 1 Route Candidates

- `/login`
- `/dashboard`
- `/workouts`
- `/workouts/new`
- `/workouts/[sessionId]`
- `/cardio`
- `/cardio/new`
- `/exercises`
- `/progress`
- `/settings`

`/progress` can be minimal in Version 1, or it can show a placeholder explaining that progress analysis comes after enough records exist.

Do not implement public signup in Version 1. Signup can be revisited later only if the user explicitly asks for it.

## Later Improvements

Later improvements may include:

- progress statistics
- best weight per exercise
- best reps per exercise
- total volume over time
- weekly training frequency
- working set trends
- cardio pace, distance, duration, and frequency trends
- CSV export
- optional charts
- optional PWA improvements
- better offline handling
- import tools for old records
- optional Supabase Realtime only if actually needed

## Explicitly Out Of Scope For Version 1

- AI coaching or AI analysis
- public profiles
- social features
- trainer/client management
- payments
- subscriptions
- media uploads
- advanced dashboards
- complex charting
- Google Drive API sync
- Samsung T7 direct sync
- multi-user collaboration

## Approval Checklist Before App Implementation

- [ ] Confirm the app name.
- [ ] Confirm the planned stack.
- [ ] Confirm Version 1 is login-only with no public signup implementation.
- [ ] Confirm email/password is the primary login method.
- [ ] Confirm the protected route list.
- [ ] Confirm the initial schema in `DATABASE_SCHEMA.md`.
- [ ] Confirm RLS is required before any user data table is used.
- [ ] Confirm whether old Supabase data should be ignored or cleaned later.
- [ ] Confirm the first mobile workflow: add exercise, start session, add sets, view recent history.
