# DECISIONS.md

This file records important project decisions. Add new entries when the project direction, architecture, auth flow, schema, deployment, or product scope changes.

## 2026-06-20

### Decision: Use Supabase Auth instead of a custom auth system

- **Reason:** Authentication stability is a top priority, and Supabase Auth already supports email/password, sessions, password reset, and integration with Supabase database policies.
- **Alternatives considered:** custom password storage, local-only password gate, magic-link-first login.
- **Consequences:** The app must follow Supabase Auth patterns carefully. Auth changes require updates to `AUTH_FLOW.md`.

### Decision: Do not implement public signup in Version 1

- **Reason:** The app is personal-use only even though the Vercel URL may be public.
- **Alternatives considered:** open signup, invite codes, a disabled signup explanation page, magic-link signup.
- **Consequences:** The user account should be created manually or through a controlled setup. Version 1 should be login-only, with signup treated only as a future possibility.

### Decision: Use Supabase Postgres as the single source of truth

- **Reason:** The app needs reliable cross-device access from iPhone, iPad, and macOS.
- **Alternatives considered:** browser localStorage only, manual JSON backup only, external file sync.
- **Consequences:** Saved records should be written to Supabase and refetched after mutations. Local state should remain transient unless a later offline strategy is documented.

### Decision: Do not store account credentials locally

- **Reason:** Passwords and account credentials must not be copied into localStorage or app tables.
- **Alternatives considered:** local password gate, saved plaintext credential hints.
- **Consequences:** The browser may only use normal Supabase-managed session/cookie behavior.

### Decision: Do not use Supabase Realtime in Version 1 unless there is a strong reason

- **Reason:** The first version needs reliable recording, not live multi-user collaboration.
- **Alternatives considered:** Realtime subscriptions for every table.
- **Consequences:** Multi-device consistency should use database writes plus refresh/refetch behavior. Realtime can be revisited later if actual use proves it is needed.

### Decision: Use Refresh/refetch behavior for basic multi-device consistency

- **Reason:** Refetching after create/edit/delete is simpler and easier to debug than optimistic sync or live subscriptions.
- **Alternatives considered:** local-first conflict resolution, background sync, Realtime.
- **Consequences:** The UI should offer a simple refresh affordance if data looks stale.

### Decision: Keep the app personal-use only

- **Reason:** Product scope should stay focused on the owner's training records.
- **Alternatives considered:** commercial SaaS, trainer/client management, public profile.
- **Consequences:** Avoid teams, billing, public sharing, account discovery, and marketing pages in Version 1.

### Decision: Keep the first version simple before adding analytics

- **Reason:** Accurate recording and stable login are prerequisites for useful progress analysis.
- **Alternatives considered:** build charts and progress dashboards immediately.
- **Consequences:** Version 1 stores clean structured data. Progress statistics and charts remain later improvements.

### Decision: Reuse the existing Supabase project for Version 2

- **Reason:** The owner confirmed the existing Supabase project is the intended backend, and old test data is disposable.
- **Alternatives considered:** create a fresh Supabase project for Version 2.
- **Consequences:** Do not trust historical rows or historical auth users as production truth. Avoid deleting old data or users unless the owner explicitly approves cleanup.

### Decision: Disable Supabase dashboard-level public signup for Version 1

- **Reason:** Version 1 is login-only and personal-use, and leaving dashboard-level signup enabled would allow API-level signup even without an app signup form.
- **Alternatives considered:** rely only on hiding signup UI in the app.
- **Consequences:** Owner accounts must be created manually or through controlled setup. If public signup is ever revisited, update `AUTH_FLOW.md`, `ROADMAP.md`, and this decision log first.

## 2026-06-23

### Decision: Keep cardio logging separate from strength workout sets

- **Reason:** Strength training sets use weight, reps, set number, and warmup/working kind. Aerobic/cardio work is better represented by duration, required kcal, conditional distance, distance unit, and notes.
- **Alternatives considered:** reuse `workout_sets` for cardio, add loosely typed notes to strength sessions, or wait for a larger analytics redesign.
- **Consequences:** Stage 5 adds `cardio_exercises` and `cardio_entries` with their own RLS policies and protected `/cardio` routes. Walking and running entries require distance plus kcal, while cycling and elliptical entries are kcal-only. The existing weight-training tables and workout flow remain unchanged.

## 2026-06-27

### Decision: Make the GitHub repository public for source-code access

- **Reason:** The owner wants external coding assistants such as Claude to read the project source code and propose or make further changes from GitHub.
- **Alternatives considered:** keep the repository private and grant collaborator access, or share a local/archive copy of the source code.
- **Consequences:** The repository `stevenjobs530-afk/personal-training-website-v2` is public, but the product boundary is unchanged: deployed app content remains login-only, public signup stays out of Version 1, and secrets such as `.env.local`, passwords, cookies, tokens, and Supabase service role keys must never be committed or copied into docs.

### Decision: Add a protected History overview and local preview-width controls

- **Reason:** The owner wants the app shell to match a page-level preview layout with top navigation and quick Phone/iPad/Desktop width checks before syncing changes to GitHub.
- **Alternatives considered:** keep the mobile bottom navigation only, or fold all history work into `/workouts`.
- **Consequences:** `/history` is a protected read-only route that combines existing strength and cardio records without adding tables. The preview-width control is a browser-local UI aid and does not change authentication, RLS, Supabase schema, or public signup boundaries.

### Decision: Add lightweight read-only progress trends

- **Reason:** The owner wants the Progress page to resemble a searchable exercise-progress view with collapsible exercise rows and trend context.
- **Alternatives considered:** keep `/progress` as a placeholder, or add a charting dependency and a larger analytics layer.
- **Consequences:** `/progress` now derives simple trends from existing Supabase rows. Strength charts average working-set weights by exercise and date, while cardio charts sum daily kcal and show a running cumulative total across the selected time range. No analytics tables, schema changes, AI analysis, Realtime, public signup, or new dependencies were added.

### Decision: Keep cardio-only exercise names out of strength training

- **Reason:** Cardio activities such as Indoor Walking belong in the separate cardio model. If a matching row exists in the strength `exercises` table, it creates duplicate Progress and Exercises entries and confuses the training categories.
- **Alternatives considered:** manually delete the live row only, add an exercise type column to `exercises`, or merge cardio into strength sets.
- **Consequences:** Strength exercise creation/update now rejects cardio-only names, strength selectors and progress lists filter them out, and the Exercises page exposes a guarded cleanup action for unreferenced duplicate strength rows. The cardio model, auth flow, RLS rules, and database schema remain unchanged.
