# AGENTS.md

This repository is for a private personal gym tracking web app. It may be deployed to a public Vercel URL, but private content must only be available after authentication.

Future Codex sessions must treat this file as the entry point before making changes.

## Required Reading

Before implementing any major change, read these files in order:

1. `ARCHITECTURE.md`
2. `AUTH_FLOW.md`
3. `DATABASE_SCHEMA.md`
4. `DECISIONS.md`
5. `TASK_HISTORY.md`
6. `ROADMAP.md`

For small copy-only edits, skim the relevant document first. For authentication, database, routing, deployment, or mobile workflow changes, read all of them.

## Working Rules

- Keep Version 1 simple, stable, and mobile-first.
- Prefer small, reviewable changes over broad rewrites.
- Do not rewrite the project architecture without explaining why and updating `ARCHITECTURE.md`.
- Do not change the authentication flow without updating `AUTH_FLOW.md`.
- Do not change the database schema without updating `DATABASE_SCHEMA.md`.
- Do not add new Supabase tables without designing Row Level Security first.
- Do not introduce a second authentication pattern unless there is a documented reason.
- Do not implement public signup in Version 1. Treat signup as a future possibility only.
- Do not add analytics, charts, Realtime, social features, payments, or public profiles to Version 1 unless `ROADMAP.md` is updated and the user approves.
- Keep the gym workflow fast on iPhone: large touch targets, minimal typing, quick set entry, and simple navigation.
- Prefer source-of-truth data in Supabase Postgres for cross-device consistency.
- After create, update, or delete operations, refetch from Supabase unless a later architecture decision documents a different sync model.
- Keep process notes, screenshots, generated outputs, and temporary deliverables inside this project folder when they need to be kept. Prefer updating existing project documents such as `TASK_HISTORY.md` instead of scattering new output files across Downloads, Desktop, or unrelated folders.

## Security Rules

- Never expose a Supabase service role key in frontend code, client bundles, docs examples, screenshots, or commits.
- Use Supabase Auth. Do not build a custom password system.
- Do not store user passwords, account credentials, or Supabase service keys in localStorage.
- Browser storage may only contain normal app state and normal Supabase session/cookie data managed by the Supabase client.
- Every table containing user data must have Row Level Security enabled.
- Every user-owned table must restrict access with `user_id = auth.uid()` or an equivalent ownership rule.
- Treat old Supabase test data as disposable unless the user explicitly says otherwise.

## Expected Stack

The planned stack is:

- Next.js App Router
- TypeScript
- Supabase Auth
- Supabase Postgres
- Tailwind CSS or another simple responsive styling solution
- Vercel deployment

Do not assume these are already implemented. Check the current files first.

## Testing And Verification

Before finishing code changes, run the available checks when possible:

- `npm run lint`
- `npm run build`
- any project tests that exist

If a check cannot be run, explain why in the final response. For UI work, verify the app in a browser-sized mobile viewport as well as desktop when practical.

## Documentation Maintenance

At the end of each major development step:

- Update `TASK_HISTORY.md` with what changed, what failed, and what remains.
- Update `DECISIONS.md` when a real architecture or product decision is made.
- Update `AUTH_FLOW.md` for any auth route, redirect, cookie/session, provider, or Supabase Auth setting change.
- Update `DATABASE_SCHEMA.md` for any table, column, relationship, trigger, or RLS policy change.
- Update `ROADMAP.md` when scope moves between Version 1 and later improvements.
