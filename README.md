# Personal Training Website Version 2

This repository is the clean Version 2 rebuild of a private personal gym tracking web app.

The app is for personal use only. It may eventually be deployed to a public Vercel URL, but private training data must only be available after login.

## Current Status

This repository has a Next.js App Router app, login-only Supabase Auth foundation, and Supabase migration files for the Version 1 schema, RLS, and live grants hardening.

The migration has been applied and verified in the selected existing Supabase project. Local Supabase environment variables are configured in ignored `.env.local`, and the production Vercel project has the same client-safe Supabase variable names configured outside Git.

Production URL:

- https://personal-training-website-v2.vercel.app

Stage 3 workout logging MVP code is implemented locally, and Stage 4 UX Rework has simplified the workout entry flow:

- exercise and machine management
- workout session creation by date
- exercise selection during workout entry
- inline exercise creation from a workout session when needed
- warmup and working set entry under the selected exercise
- quick weight and reps controls with manual input still available
- recent workout history from sessions, exercises, and sets
- protected route redirects for signed-out visitors

The authenticated owner workflow still needs final manual browser QA on this machine before claiming the reworked Version 1 flow is fully verified. Production signed-out route protection has been checked, but production login, logout, and workout logging still require the owner to enter the controlled account password.

See `SUPABASE_SETUP.md` for setup and manual QA notes.

## Version 1 Boundary

Version 1 should be login-only:

- login page
- logout behavior
- protected routes
- reliable session persistence
- manually or otherwise controlled Supabase account setup
- personal workout logging after authentication

Do not implement public signup in Version 1. Treat signup as a future possibility only.

## Required Reading For Future Codex Sessions

Before making major changes, read:

1. `AGENTS.md`
2. `ARCHITECTURE.md`
3. `AUTH_FLOW.md`
4. `DATABASE_SCHEMA.md`
5. `DECISIONS.md`
6. `TASK_HISTORY.md`
7. `ROADMAP.md`

## Planned Stack

- Next.js App Router
- TypeScript
- Supabase Auth
- Supabase Postgres
- Tailwind CSS or another simple responsive styling solution
- Vercel deployment

## Safety Notes

Do not commit:

- `.env.local`
- real environment variables
- Supabase service role keys
- database connection secrets
- passwords
- cookies or tokens
- real private training exports unless explicitly approved
