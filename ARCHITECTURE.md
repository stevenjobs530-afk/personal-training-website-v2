# ARCHITECTURE.md

Last updated: 2026-06-23

## Project Goal

Build a private personal gym tracking web app for recording workouts and checking progress over time. The main use case is fast workout entry on an iPhone in the gym, with the same data available later on iPad and macOS.

This is not a commercial SaaS product. Public marketing pages, teams, billing, social features, and public profiles are out of scope.

## Planned Tech Stack

- **Framework:** Next.js with App Router
- **Language:** TypeScript
- **Authentication:** Supabase Auth with email and password
- **Database:** Supabase Postgres
- **Styling:** Tailwind CSS or another simple responsive styling solution
- **Deployment:** Vercel, if suitable
- **Hosting model:** public deployment URL, private authenticated app content

## High-Level Architecture

The app should use a simple server-backed architecture:

- Next.js renders public auth routes and protected app routes.
- Supabase Auth manages identity, password login, session persistence, and logout.
- Supabase Postgres stores exercises, workout sessions, and workout sets.
- Row Level Security protects every user-owned record.
- Vercel hosts the app and supplies public Supabase environment variables.

Supabase Postgres should be the single source of truth for workout data in Version 1. Local UI state can exist for form inputs and transient interaction state, but saved workout data should be refetched from Supabase after mutations.

## Frontend Structure

Planned routes are documented in `ROADMAP.md`. The first implementation should keep the structure small:

- public login route
- logout behavior
- reliable session persistence
- protected dashboard
- protected workout entry flow
- protected exercise list/add flow
- protected recent history view
- protected combined history overview for strength and cardio sessions
- simple settings route for sign out and setup status

The UI should be mobile-first. Desktop and iPad layouts can widen the same simple flows rather than introducing a separate complex dashboard.

## Backend And Data Structure

The backend is Supabase:

- Supabase Auth stores users.
- `profiles` stores app-specific user profile data.
- `exercises` stores user-owned exercise or machine names.
- `workout_sessions` stores workout dates.
- `workout_sets` stores warmup and working set rows.
- `cardio_exercises` stores user-owned aerobic/cardio exercise names and categories.
- `cardio_entries` stores duration, required kcal, conditional distance, and notes for cardio work.

The planned schema is documented in `DATABASE_SCHEMA.md`.

## Supabase Usage

Use Supabase for:

- email/password authentication
- session management
- Postgres database
- Row Level Security
- future CSV/export-friendly queries

Do not use Supabase Realtime in Version 1 unless there is a strong documented reason. Basic multi-device consistency should use normal database writes followed by refetch/refresh.

## Vercel Deployment Assumptions

The app may be deployed to Vercel. The deployment URL is public, but app content must be private.

Vercel should store only public client-safe Supabase values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Never store or expose a service role key in frontend code. If a future server-only job needs a secret key, it must be documented separately and kept out of client bundles.

## Mobile-First Principle

The gym workflow should be designed first for iPhone:

- one-hand use
- large touch targets
- minimal typing
- quick add set flow
- clear warmup vs working set selection
- easy switching between exercises or machines
- simple bottom navigation or similarly mobile-friendly navigation
- readable forms under gym lighting and fatigue

Desktop should support review and maintenance, but iPhone recording speed is the primary product constraint.

## Version 1 Includes

- login
- logout
- reliable session persistence
- protected dashboard
- add exercises or machine names
- create workout sessions by date
- record warmup sets and working sets
- record weight and reps
- view recent workout history
- view a combined strength/cardio history overview
- record aerobic/cardio work separately from strength sets
- simple refresh/refetch behavior
- mobile-friendly layout

## Version 1 Excludes

- complex charts
- AI analysis
- social features
- payments
- public profiles
- teams or sharing
- Supabase Realtime
- media uploads
- advanced dashboards
- automatic Google Drive or external-disk sync
- public signup

These can be revisited only after the core recording and authentication flow is stable.

## Cardio Logging Boundary

Stage 5 adds a separate cardio model for aerobic work. Indoor Walking, Outdoor
Walking, Indoor Running, and Outdoor Running require distance plus kcal. Indoor
Cycling and Elliptical are recorded by kcal without distance. Cardio entries use
duration, conditional distance, distance unit, kcal, and optional notes. They
should not be forced into `workout_sets`, because strength sets use weight, reps,
set number, and warmup/working kind.
