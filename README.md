# Personal Training Website Version 2

This repository is the clean Version 2 rebuild of a private personal gym tracking web app.

The app is for personal use only. It may eventually be deployed to a public Vercel URL, but private training data must only be available after login.

## Current Status

This repository is currently in the documentation and project-memory stage.

No app implementation has been added yet. No Supabase configuration has been changed. No database tables have been created for Version 2.

## Version 1 Boundary

Version 1 should be login-only:

- login page
- logout behavior
- protected routes
- reliable session persistence
- manually or otherwise controlled Supabase account setup

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
