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

## Failed Or Abandoned Attempts

- A previous version of this project was tested, but the result was not satisfactory, especially around login/authentication stability.
- The project is being rebuilt from scratch with a cleaner architecture.
- Old implementation choices should not be assumed valid for this new version.

## Known Problems

- Authentication design must be handled carefully before implementation.
- Localhost browser behavior can differ from real iPhone/iPad/macOS production usage.
- Old test data in Supabase should not be treated as valuable production data.
- The database schema and RLS policies still need to be implemented and verified.

## Current Priorities

- Approve the documentation structure.
- Confirm the Version 1 architecture.
- Confirm the authentication flow before writing app code.
- Confirm the initial database schema and RLS plan before creating tables.

## Next Planned Tasks

- Create the actual Next.js App Router project structure.
- Add Supabase SSR auth helpers using the current recommended package.
- Implement a login-only email/password flow.
- Implement logout behavior and reliable session persistence.
- Implement protected routes.
- Create Supabase SQL migration files for the planned schema and RLS policies.
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
