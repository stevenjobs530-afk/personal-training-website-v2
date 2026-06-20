# DATABASE_SCHEMA.md

Last updated: 2026-06-20

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
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Relationships:

- one profile per Supabase Auth user

RLS expectation:

- user can select, insert, update, and delete only their own profile where `id = auth.uid()`

Notes:

- Do not store passwords, credentials, or private third-party tokens here.

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

## Future Progress Analysis Support

The planned schema can later support:

- best weight per exercise
- best reps per exercise
- total volume over time
- recent progress comparison
- weekly training frequency
- working set trends
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
