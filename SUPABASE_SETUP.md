# Supabase Setup Notes

Last updated: 2026-06-20

This app uses Supabase Auth with email and password, `@supabase/ssr`, and cookie-based sessions in the Next.js App Router.

Version 1 is login-only. Do not add public signup, magic-link-first login, service role keys, passwords, cookies, or tokens to this repository.

## Current Live Setup Status

On 2026-06-20, the reviewed Version 1 schema/RLS migration was applied to the existing Supabase project selected by the owner. A follow-up grants hardening migration was also applied so the Version 1 user-data tables grant only normal CRUD access to the `authenticated` role.

Public signup was disabled in Supabase Auth settings. Email/password auth remains enabled. Historical users and old test data from the reused project were not deleted.

A local `.env.local` file was created on this machine with client-safe Supabase values only. It is ignored by Git and must not be committed or pasted into docs.

On 2026-06-20, the Vercel production project was created at:

- https://personal-training-website-v2.vercel.app

Vercel Production and Preview environments were configured with the same client-safe Supabase variable names. Values are intentionally not documented here.

## Local Environment

Create a local `.env.local` file in the repository root. This file is ignored by Git.

Use placeholder names below as a shape only:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Use the Supabase Project URL and Publishable key from the Supabase dashboard.

Do not add these to `.env.local`:

- Supabase service role key
- Supabase secret key
- database password
- account password
- cookies
- access tokens
- refresh tokens

## Vercel Environment

When deploying to Vercel, add the same client-safe variables in the Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

These variables are configured for the `personal-training-website-v2` Vercel project as of 2026-06-20.

Do not add a service role key unless a future server-only feature explicitly needs one and the architecture is updated first.

## Supabase Auth Settings

In Supabase Auth settings:

1. Enable Email provider password login.
2. Keep public signup disabled for Version 1.
3. Create the owner account manually in Supabase Auth or through another controlled setup.
4. Configure URL settings for local and production usage.

Current local URL entries:

- Redirect URL: `http://localhost:3000/**`
- Redirect URL: `http://localhost:3000/auth/callback`

Current production URL entries:

- Site URL: `https://personal-training-website-v2.vercel.app`
- Redirect URL: `https://personal-training-website-v2.vercel.app/**`

For Vercel preview deployments, add a preview redirect pattern only if preview login testing is needed:

- `https://*-your-team-or-account-slug.vercel.app/**`

Use exact production Site URLs where possible. Wildcards are most useful for localhost, production path redirects, and preview environments.

The reused project's old `setline-personal-training` production redirect URL was removed on 2026-06-20 after the Version 2 production URL was added.

## Current Auth Flow

- `/login` is public.
- Authenticated users visiting `/login` redirect to `/dashboard`.
- `/dashboard`, `/workouts`, `/workouts/new`, `/exercises`, `/progress`, and `/settings` are protected.
- Unauthenticated users visiting protected routes redirect to `/login?next=...`.
- Login uses `supabase.auth.signInWithPassword()` in a Server Action.
- Logout uses `supabase.auth.signOut({ scope: "local" })` in a Server Action and redirects to `/login`.
- Route protection uses root `proxy.ts` plus server-side `requireAuth()` calls on protected pages.

## Manual Browser Test Checklist

After `.env.local` and Supabase Auth are configured:

1. Start the app with `npm run dev`.
2. Visit `http://localhost:3000/dashboard` while signed out.
3. Confirm it redirects to `/login?next=%2Fdashboard`.
4. Log in with the controlled owner account.
5. Confirm successful login redirects to `/dashboard`.
6. Visit `/login` while signed in.
7. Confirm it redirects back to `/dashboard`.
8. Open each protected route:
   - `/dashboard`
   - `/workouts`
   - `/workouts/new`
   - `/exercises`
   - `/progress`
   - `/settings`
9. Use the sign out button.
10. Confirm it redirects to `/login`.
11. Try a protected route again and confirm it redirects to `/login?next=...`.

Do not paste credentials, cookies, tokens, or Supabase keys into issue comments, docs, screenshots, commits, or chat.
