# DATABASE_SCHEMA.md

Last updated: 2026-07-02

## Database Goal

Use Supabase Postgres as the single source of truth for personal workout data. The schema should be small, explicit, and ready for future progress analysis without making Version 1 complicated.

All user data must be protected by Row Level Security.

## Ownership Model

For user-owned tables, each row should include:

- `user_id uuid not null references auth.users(id) on delete cascade`

RLS policies should allow each authenticated user to select, insert, update, and delete only rows where:

```sql
user_id = auth.uid()
```

The `profiles` table is owned by `id`, where `id` matches `auth.users.id`.

## Table: profiles

Purpose:

Stores app-specific profile information for the authenticated owner.

Fields:

- `id uuid primary key references auth.users(id) on delete cascade`
- `display_name text`
- `last_seen_date date`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Relationships:

- one profile per Supabase Auth user

RLS expectation:

- user can select, insert, update, and delete only their own profile where `id = auth.uid()`

Notes:

- Do not store passwords, credentials, or private third-party tokens here.
- `last_seen_date` stores the last local calendar date the owner opened the app. It is used only to backfill missed blank days as Rest Days.

## Table: exercises

Purpose:

Stores the user's exercise or machine names.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `name text not null`
- `notes text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended constraints:

- unique exercise name per user via a `lower(btrim(name))` expression index
- exercise names should not be blank after trimming whitespace

Relationships:

- one user has many exercises
- one exercise has many workout sets

RLS expectation:

- user can access only rows where `user_id = auth.uid()`

## Table: workout_sessions

Purpose:

Stores one workout session on a specific date.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `workout_date date not null`
- `notes text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Relationships:

- one user has many workout sessions
- one workout session has many workout sets

RLS expectation:

- user can access only rows where `user_id = auth.uid()`

## Table: workout_sets

Purpose:

Stores individual set records for a workout session and exercise.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `session_id uuid not null references workout_sessions(id) on delete cascade`
- `exercise_id uuid not null references exercises(id) on delete restrict`
- `set_number integer not null`
- `set_kind text not null check (set_kind in ('warmup', 'working'))`
- `weight numeric(8, 2) not null check (weight >= 0)`
- `reps integer not null check (reps >= 0)`
- `notes text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended constraints:

- `set_number > 0`
- optional unique ordering constraint such as `unique (session_id, exercise_id, set_number)` if the UI guarantees one sequence per exercise per session

Relationships:

- each set belongs to one user
- each set belongs to one workout session
- each set belongs to one exercise

RLS expectation:

- user can access only rows where `user_id = auth.uid()`
- the Stage 2.5 migration includes a trigger to ensure `session_id` and `exercise_id` belong to the same `user_id`

## Table: cardio_exercises

Purpose:

Stores the user's aerobic/cardio exercise names and categories separately from
strength-training exercise names.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `name text not null`
- `category text not null check (category in ('indoor_walking', 'outdoor_walking', 'indoor_running', 'outdoor_running', 'cycling', 'elliptical'))`
- `default_distance_unit text not null default 'km' check (default_distance_unit in ('km', 'mi'))`
- `notes text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended constraints:

- unique cardio exercise name per user via a `lower(btrim(name))` expression index
- cardio exercise names should not be blank after trimming whitespace

Relationships:

- one user has many cardio exercises
- one cardio exercise has many cardio entries

RLS expectation:

- user can access only rows where `user_id = auth.uid()`

## Table: cardio_entries

Purpose:

Stores individual aerobic/cardio records measured by duration, required kcal,
conditional distance, and optional notes.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `cardio_exercise_id uuid not null references cardio_exercises(id) on delete restrict`
- `cardio_date date not null`
- `duration_seconds integer not null check (duration_seconds > 0)`
- `distance_value numeric(8, 2) check (distance_value is null or distance_value > 0)`
- `distance_unit text not null check (distance_unit in ('km', 'mi'))`
- `calories integer not null check (calories > 0)`
- `notes text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Relationships:

- each cardio entry belongs to one user
- each cardio entry belongs to one cardio exercise

RLS expectation:

- user can access only rows where `user_id = auth.uid()`
- the Stage 5 migration includes a trigger to ensure `cardio_exercise_id` belongs to the same `user_id`
- the same trigger requires distance for indoor/outdoor walking and running, and clears distance for cycling and elliptical entries

## Table: rest_days

Purpose:

Stores logged rest/recovery days so blank dates can be explicitly recorded as
recovery days. One rest day per user per date.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `rest_date date not null`
- `notes text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended constraints:

- `unique (user_id, rest_date)` so a date cannot be logged as resting twice
- Rest Days must not share a date with strength `workout_sessions` or
  `cardio_entries` for the same user

Relationships:

- one user has many rest days

RLS expectation:

- user can access only rows where `user_id = auth.uid()`

Notes:

- A Rest Day is a day-level marker, not a session.
- If a Rest Day was logged by mistake, delete the Rest Day first, then record
  the missed strength workout or cardio entry.
- The Today page uses `profiles.last_seen_date` to backfill missed blank
  calendar dates as Rest Days when the owner next opens the app.

## Migration Support Objects

The Stage 2.5 migration adds:

- `public.set_updated_at()` trigger function to maintain `updated_at` on updates
- `public.validate_workout_set_ownership()` trigger function to prevent `workout_sets` from referencing another user's session or exercise
- indexes on user-owned and foreign key columns used by RLS, joins, and cascades
- `grant select, insert, update, delete` for the `authenticated` role only
- explicit `revoke all` from `anon` on the Version 1 user-data tables

The Stage 2 live verification hardening migration adds:

- an explicit revoke of `truncate`, `references`, and `trigger` from `authenticated` on the Version 1 user-data tables
- a confirming grant of only `select`, `insert`, `update`, and `delete` to `authenticated`

The Stage 5 cardio migration adds:

- `cardio_exercises` and `cardio_entries`
- Row Level Security on both cardio tables
- per-operation owner-scoped policies using `user_id = auth.uid()`
- `public.validate_cardio_entry_ownership()` to prevent entries from referencing another user's cardio exercise and enforce cardio distance rules
- a unique per-user normalized cardio exercise name index
- useful indexes on user/date/category and cardio exercise references
- authenticated CRUD grants only, unsafe anon access revoked, and `truncate`, `references`, and `trigger` revoked from `authenticated`

Live status: applied in the selected Supabase project on 2026-06-27 using
`supabase/migrations/202606270001_apply_cardio_schema_and_seed_exercises.sql`.
The seed creates default cardio exercises for existing auth users.

The Stage 6 rest day migration
(`supabase/migrations/202607020001_create_rest_days_schema_and_rls.sql`) adds:

- `profiles.last_seen_date` as the last local calendar date used for Rest Day
  backfill
- `rest_days` with a unique `(user_id, rest_date)` index
- trigger guards that prevent Rest Days from sharing a date with strength
  workout sessions or cardio entries for the same user
- Row Level Security with per-operation owner-scoped policies
- the shared `set_updated_at()` trigger
- authenticated CRUD grants only, anon access revoked, and `truncate`,
  `references`, and `trigger` revoked from `authenticated`

Live status: applied in the selected Supabase project on 2026-07-02 using
`supabase/migrations/202607020001_create_rest_days_schema_and_rls.sql`.
Remote verification confirmed `rest_days` exists with Row Level Security
enabled, four owner-scoped policies, authenticated CRUD grants only, no `anon`
table privileges, and trigger guards for strength/cardio/Rest Day date
conflicts.

## Workout History Storage

Workout history is the combination of:

- `workout_sessions.workout_date`
- `exercises.name`
- ordered `workout_sets`
- `set_kind`
- `weight`
- `reps`
- optional notes

Version 1 should read recent history by joining sessions, exercises, and sets. Do not create a separate denormalized history table unless a later decision documents the need.

## Cardio History Storage

Cardio history is the combination of:

- `cardio_entries.cardio_date`
- `cardio_exercises.name`
- `cardio_exercises.category`
- `cardio_entries.duration_seconds`
- `cardio_entries.distance_value`
- `cardio_entries.distance_unit`
- `cardio_entries.calories`
- optional notes

Kcal is the primary cardio progress metric. Pace and speed are display-only
derived values when distance is present; do not store them unless a later
decision documents the need.

## Future Progress Analysis Support

The planned schema can later support:

- best weight per exercise
- best reps per exercise
- total volume over time
- recent progress comparison
- weekly training frequency
- working set trends
- cardio kcal, distance, duration, and frequency summaries
- CSV export

These can be derived from `workout_sets` joined to `workout_sessions` and `exercises`.

## Data Not Stored In Version 1

Do not store these in Version 1 unless the roadmap changes:

- photos or videos
- public profile data
- social feed data
- payments or billing data
- AI-generated analysis
- third-party credentials
- raw browser cookies or tokens
- real passwords
- large media files

## RLS Draft Policy Shape

Each user-owned table should follow this pattern:

```sql
alter table public.exercises enable row level security;

create policy "Users can select own exercises"
on public.exercises
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can insert own exercises"
on public.exercises
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update own exercises"
on public.exercises
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete own exercises"
on public.exercises
for delete
to authenticated
using (user_id = auth.uid());
```

Repeat the same ownership pattern for `workout_sessions` and `workout_sets`. Use `id = auth.uid()` for `profiles`.

## Owner History Management

Migration `20260722155833_add_safe_history_management.sql` adds the authenticated
`delete_my_training_history(text)` RPC. It is a security-invoker function, uses
`auth.uid()` for every delete, and requires the exact confirmation phrase. It
deletes owner rows from `workout_sets`, `workout_sessions`, `cardio_entries`, and
`rest_days`; exercise libraries, profiles, auth users, and preference cookies are
not deleted.

The same migration only narrows API permissions on legacy Setline objects when
those objects exist. It deliberately does not drop unknown legacy tables or data.
Apply this migration only after preview approval and a backup/export check.
