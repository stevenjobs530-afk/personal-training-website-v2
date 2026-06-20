# TASK_HISTORY.md

This file tracks what has been done, what failed, and what future Codex sessions should not repeat.

## Completed Tasks

- 2026-06-20: Created the initial project memory/documentation structure:
  - `AGENTS.md`
  - `ARCHITECTURE.md`
  - `AUTH_FLOW.md`
  - `DATABASE_SCHEMA.md`
  - `DECISIONS.md`
  - `README.md`
  - `TASK_HISTORY.md`
  - `ROADMAP.md`
- 2026-06-20: Renamed the local Version 2 folder to `/Users/stevenjobs/Downloads/personal-training-website-v2`.
- 2026-06-20: Created and pushed the private GitHub repository `stevenjobs530-afk/personal-training-website-v2`.
- 2026-06-20: Completed Stage 2.0 preflight audit:
  - Read the required project documentation and uploaded Stage 2 plan.
  - Confirmed the repository contained documentation only, with no existing Next.js implementation to preserve.
  - Confirmed Git was clean on `main` and aligned with `origin/main` before app scaffolding.
- 2026-06-20: Completed Stage 2.1 Next.js App Router skeleton:
  - Added `package.json`, `package-lock.json`, Next.js, TypeScript, ESLint, Tailwind/PostCSS configuration, and the root `app/` structure.
  - Added route placeholders for `/login`, `/dashboard`, `/workouts`, `/workouts/new`, `/exercises`, `/progress`, and `/settings`.
  - Added a simple mobile-first app shell with large touch targets and bottom navigation on mobile.
  - Added lightweight icon handling for `/icon.svg` and `/favicon.ico`.
  - Installed dependencies and resolved a toolchain issue by using ESLint 9.x with `eslint-config-next` 16.
  - Added a `postcss` override to resolve the npm audit issue reported through Next.js dependencies.
  - Verified `npm run lint`, `npm run build`, and `npm audit --audit-level=moderate` all pass.
  - Verified rendered desktop and mobile placeholders through local production-mode Playwright checks.
- 2026-06-20: Completed Stage 2.2 Supabase environment and client foundation:
  - Added `@supabase/ssr` and `@supabase/supabase-js`.
  - Added browser and server Supabase client helpers under `lib/supabase/`.
  - Added `.env.example` with placeholder-only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
  - Confirmed `.env.local` remains ignored through the existing `.env.*` rule.
  - Documented that Version 2 uses the current publishable key convention instead of the legacy anon key by default.
  - Did not add login UI behavior, public signup, database tables, migrations, or workout logging.
- 2026-06-20: Completed Stage 2.3 login-only Supabase Auth implementation:
  - Added a mobile-friendly `/login` form for email/password login using a Server Action and `supabase.auth.signInWithPassword()`.
  - Added root `proxy.ts` plus `lib/supabase/proxy.ts` to refresh Supabase SSR cookies and redirect protected routes.
  - Added server-side `requireAuth()` checks to `/dashboard`, `/workouts`, `/workouts/new`, `/exercises`, `/progress`, and `/settings`.
  - Added a logout Server Action that calls Supabase sign out for the current browser session and redirects to `/login`.
  - Kept Version 1 login-only: no signup form, signup link, magic-link-first login, custom password system, or service role key.
  - Verified `npm run lint`, `npm run build`, and `npm audit --audit-level=moderate` pass.
  - With no local Supabase env configured, verified protected routes fail closed to `/login?next=...` and `/login` renders with a safe setup message.
  - Real credential login/logout could not be tested locally because `.env.local` is not configured in this workspace.
- 2026-06-20: Completed Stage 2.4 auth verification and manual setup notes:
  - Reviewed the auth implementation and confirmed it uses one Supabase SSR/cookie-based auth pattern.
  - Confirmed there is no public signup route, signup form, signup link, or magic-link-first login flow.
  - Confirmed no service role key is used in frontend code or setup documentation.
  - Confirmed `.env.local`, `.env.production`, and `.env` are ignored by `.gitignore`.
  - Confirmed protected routes are guarded by root `proxy.ts` and per-page server-side `requireAuth()` calls.
  - Added `SUPABASE_SETUP.md` with placeholder-only local, Vercel, Supabase Auth, redirect URL, owner account, and manual browser test notes.
  - Updated `README.md` to reflect the current Stage 2 auth foundation and point to `SUPABASE_SETUP.md`.
  - Verified `npm run lint`, `npm run build`, and `npm audit --audit-level=moderate` pass.
- 2026-06-20: Completed Stage 2.5 Supabase migration file creation:
  - Added `supabase/migrations/202606200001_create_v1_schema_and_rls.sql`.
  - Migration includes `profiles`, `exercises`, `workout_sessions`, and `workout_sets`.
  - Migration enables Row Level Security on every Version 1 user-data table.
  - Migration adds per-operation RLS policies using `id = auth.uid()` for `profiles` and `user_id = auth.uid()` for user-owned workout tables.
  - Migration adds constraints for set kind, non-negative weight and reps, positive set number, non-blank exercise names, and unique set numbering per session/exercise.
  - Migration adds timestamp triggers, ownership validation for workout set session/exercise references, authenticated grants, anon revokes, and useful indexes.
  - Updated `DATABASE_SCHEMA.md` to match the final migration support objects and concrete exercise-name uniqueness behavior.
  - No live Supabase database was changed.
- 2026-06-20: Completed Stage 2.6 manual migration review:
  - Read all migration files under `supabase/migrations/`.
  - Compared the SQL against `DATABASE_SCHEMA.md`.
  - Confirmed RLS is enabled and policies restrict access by `auth.uid()`.
  - Confirmed no old test data import, service role key, secret, token, cookie, public profile, team, social, payment, media, AI, or analytics table appears in the migration.
  - Review status: safe to apply manually in Supabase SQL Editor after selecting the correct Version 2 project.
- 2026-06-20: Completed Stage 2.7 live Supabase database application:
  - Confirmed the selected existing Supabase project is the project the owner wants to reuse.
  - Applied `supabase/migrations/202606200001_create_v1_schema_and_rls.sql` in Supabase SQL Editor.
  - Verified `profiles`, `exercises`, `workout_sessions`, and `workout_sets` exist with Row Level Security enabled.
  - Verified each Version 1 user-data table has four owner-scoped policies for select, insert, update, and delete.
  - Did not delete old test data or old auth users from the reused Supabase project.
- 2026-06-20: Completed Stage 2.7.5 GitHub sync:
  - Confirmed the local folder is `/Users/stevenjobs/Downloads/personal-training-website-v2`.
  - Confirmed the current branch is `main`.
  - Confirmed `origin` points to `https://github.com/stevenjobs530-afk/personal-training-website-v2.git`.
  - Confirmed there were no unpushed commits before the sync commit; the local worktree contained completed Stage 2 foundation files and documentation updates.
  - Confirmed `.env.local`, `.env.production`, and `.env` are ignored and were not committed.
  - Confirmed `.env.example` contains placeholder-only Supabase values.
  - Verified `npm run lint` and `npm run build` pass before committing.
  - Committed the completed Stage 2 foundation as `f69ddae chore: sync completed stage 2 foundation`.
  - Pushed the commit to `origin/main` without force push.
- 2026-06-20: Completed Stage 2.8 final Stage 2 foundation review:
  - Confirmed the Next.js App Router project structure, TypeScript config, Tailwind/PostCSS styling foundation, Supabase SSR/browser client helpers, login-only auth, logout action, protected routes, placeholder-only env example, and migration file are present.
  - Confirmed no public signup implementation, second auth pattern, service role key, local-only environment file, analytics/chart feature, or workout logging implementation was found.
  - Confirmed the migration file includes `profiles`, `exercises`, `workout_sessions`, `workout_sets`, and RLS policies for each table.
  - Verified `.env.local`, `.env.production`, and `.env` are ignored by `.gitignore`.
  - Verified `npm run lint`, `npm run build`, and `npm audit --audit-level=moderate` pass.
  - Verified a production-mode local smoke test redirects unauthenticated protected routes to `/login?next=...` when Supabase environment variables are absent.
  - Final review result: local Stage 2 foundation is coherent, but live Supabase migration application and real owner-account login/logout testing still need manual confirmation before workout logging can safely begin.
- 2026-06-20: Completed live Supabase connection hardening and local env setup:
  - Added `supabase/migrations/202606200002_harden_v1_table_grants.sql`.
  - Applied the grants hardening migration in Supabase SQL Editor.
  - Verified the Version 1 user-data tables grant only `DELETE`, `INSERT`, `SELECT`, and `UPDATE` to `authenticated`, with no `anon` grant rows.
  - Confirmed Supabase Auth Email provider is enabled and most other providers remain disabled.
  - Turned off the Supabase Auth dashboard-level "Allow new users to sign up" setting for Version 1.
  - Confirmed the reused Supabase project still contains historical auth users; no auth users were deleted.
  - Created ignored local `.env.local` with client-safe Supabase URL and publishable key values only.
  - Confirmed `.env.local` is ignored by Git.
  - Verified `npm run dev` with `.env.local` configured returns `307` from `/dashboard` to `/login?next=%2Fdashboard` while signed out.
  - Verified `/login` returns `200` locally with `.env.local` configured.
  - Noted that the reused project's URL configuration still points to an old production URL and should be replaced with Version 2 localhost and production URLs before production deployment or email-link/password-reset flows.

## Failed Or Abandoned Attempts

- A previous version of this project was tested, but the result was not satisfactory, especially around login/authentication stability.
- The project is being rebuilt from scratch with a cleaner architecture.
- Old implementation choices should not be assumed valid for this new version.

## Known Problems

- Authentication design must be handled carefully before implementation.
- Localhost browser behavior can differ from real iPhone/iPad/macOS production usage.
- Old test data in Supabase should not be treated as valuable production data.
- The live database schema, RLS, and table grants are applied and verified in the selected existing Supabase project.
- The reused Supabase project still contains historical auth users. For strict owner-only personal use, delete or disable old users later, or add an owner allowlist before exposing the app broadly.
- Real owner-account login/logout still needs browser testing because Codex should not know or type the account password.
- The reused Supabase project's URL configuration still references an old production URL; update it once the Version 2 Vercel URL is ready.

## Current Priorities

- Test login, logout, and protected-route behavior with the controlled owner account.
- Configure Vercel environment variables before production deployment.
- Replace old Supabase Auth URL settings with Version 2 localhost and production URLs before production auth testing.

## Next Planned Tasks

- Test real login/logout on localhost using the controlled owner account.
- Test real login/logout on production once Vercel environment variables and Auth URL settings are configured.
- Build the mobile-first workout entry MVP.

## Things To Avoid Repeating

- Do not mix multiple auth patterns.
- Do not use magic links as the primary flow unless the auth decision changes.
- Do not implement public signup in Version 1.
- Do not rely on localhost tests as proof that iPhone production login works.
- Do not expose service role keys in frontend code.
- Do not create tables without RLS policies.
- Do not import or rely on old Supabase test data as production data.
- Do not overbuild analytics before workout recording is stable.
