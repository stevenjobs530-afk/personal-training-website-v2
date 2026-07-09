# ROADMAP.md

Last updated: 2026-07-09

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
- use a lightweight local rest timer between saved strength sets
- add simple notes where useful
- view recent workout history
- view a combined strength/cardio training history overview
- view lightweight derived exercise progress trends
- record aerobic/cardio entries separately from strength sets
- record Rest Days for blank recovery dates
- automatically backfill missed blank dates as Rest Days on the next app visit
- mobile-friendly layout for iPhone
- responsive layout for iPad and macOS
- simple refresh/refetch behavior after changes

## Current Workflow Status

UX Rework 1-5 confirms the Version 1 workout entry flow is now structured enough for a future progress stage:

- `/workouts/new` creates a dated workout session and sends the owner to the session detail page for structured set entry.
- `/workouts/[sessionId]` starts with exercise selection, supports inline exercise creation, and records warmup/working sets under the selected exercise.
- Each saved set keeps `session_id`, `exercise_id`, `set_kind`, `weight`, `reps`, `set_number`, and optional notes.
- `/workouts/[sessionId]` includes a browser-local rest timer that starts after a new set is saved and remembers the preferred rest duration on that device only.
- `/workouts` recent history reads sessions, sets, and exercises, then groups sets under each exercise name.
- Session notes and set notes remain optional context fields, not the primary place for structured workout data.

The 2026-06-27 local preview adds a lightweight derived progress page. Strength trends are calculated from working sets joined to workout sessions and exercises; warm-ups are excluded. Cardio progress is calculated from daily kcal totals and displayed as a cumulative running total over 1 week, 1 month, 6 month, or 1 year ranges when the Stage 5 cardio setup is available. This remains a read-only view and does not add analytics tables, AI analysis, Realtime, or advanced dashboards.

Stage 5 adds an Aerobic / Cardio Logging MVP:

- `/cardio` shows recent cardio entries.
- `/cardio/new` records date, cardio exercise, category for new exercise names, duration, required kcal, conditional distance, distance unit, and optional notes.
- Cardio data uses `cardio_exercises` and `cardio_entries` rather than `workout_sets`.
- Indoor/Outdoor Walking and Indoor/Outdoor Running require distance plus kcal; Indoor Cycling and Elliptical are kcal-only.
- This stage does not add charts, AI analysis, Realtime, social features, payments, public profiles, or advanced dashboards.

The 2026-06-27 local preview update adds a protected `/history` overview that combines strength sessions and cardio entries into a frequency grid and compact session cards. This is a read-only history surface and does not change the underlying workout or cardio data models.

The later 2026-06-27 polish pass makes `/history` collapsible by year, month, and day; groups `/exercises` into Anaerobic and Aerobic sections; and changes `/progress` from a placeholder into a searchable accordion with simple SVG trend charts. Cardio-only exercise names are kept out of strength training selectors and trend lists so Indoor Walking remains an Aerobic/Cardio item.

Stage 6 adds a simple Rest Day flow:

- `/dashboard` is the Today page and includes a `Today is Rest Day` action.
- Rest Days use the `rest_days` table and are owner-scoped with RLS.
- Rest Days cannot share a date with strength workout sessions or cardio entries.
- The Today page uses `profiles.last_seen_date` to backfill missed blank
  calendar dates as Rest Days when the owner next opens the app.
- Corrections stay simple: remove a Rest Day from Today or Workouts, then record
  the missed workout or cardio entry.

## Version 1 Route Candidates

- `/login`
- `/dashboard`
- `/workouts`
- `/workouts/new`
- `/workouts/[sessionId]`
- `/cardio`
- `/cardio/new`
- `/history`
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
- cardio kcal, distance, duration, and frequency trends
- CSV export
- richer optional charts
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
