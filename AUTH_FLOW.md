# AUTH_FLOW.md

Last updated: 2026-06-23

## Authentication Goal

The app may live at a public Vercel URL, but private gym data must only be available to the authenticated owner. Authentication stability is a top priority because the previous version had repeated login and session problems.

## Auth Provider

Use Supabase Auth with email and password.

Do not build a custom password system. Do not store passwords in localStorage. Do not use magic links as the primary Version 1 login flow unless this decision is deliberately changed and documented.

## Public Signup

Public signup is not part of Version 1.

The owner account should be created manually in Supabase Auth or through another controlled setup. Treat any earlier mention of signup as a future possibility, not a Version 1 requirement.

Do not implement a public signup form in Version 1.

Live Supabase verification on 2026-06-20 found the dashboard-level "Allow new users to sign up" setting enabled from the reused project. It was turned off for Version 1 so public signup is disabled both in the app UI and in Supabase Auth settings.

## Planned Routes

- `/login` public login page
- `/auth/callback` callback route if the chosen Supabase flow needs code exchange, password reset, or future email confirmation handling
- `/dashboard` protected
- `/workouts` protected
- `/workouts/new` protected
- `/workouts/[sessionId]` protected
- `/cardio` protected
- `/cardio/new` protected
- `/history` protected
- `/exercises` protected
- `/progress` protected
- `/settings` protected

Unauthenticated users should only see the login page and any required auth callback handling. Authenticated users should be redirected away from `/login` to `/dashboard`.

Stage 2.3 implements `/login` and the protected route redirects. `/auth/callback` is not implemented yet because the current Version 1 flow is password login only and does not use magic-link-first login.

## Next.js App Router Session Design

Prefer the current Supabase server-side auth approach for Next.js App Router:

- use `@supabase/ssr`
- use a browser client only in Client Components that need browser-side Supabase calls
- use a server client in Server Components, Server Actions, and Route Handlers
- use cookie/session-based auth suitable for server rendering
- use a Next.js proxy/middleware-style session refresh path so protected routes see a current session

Stage 2.3 uses:

- `lib/supabase/client.ts` for browser-side Supabase clients
- `lib/supabase/server.ts` for Server Components and Server Actions
- `lib/supabase/proxy.ts` plus root `proxy.ts` for cookie/session refresh and route-level redirects
- `supabase.auth.getClaims()` for server-side route protection checks

Official Supabase guidance currently recommends `@supabase/ssr` for cookie-based SSR auth and warns that older auth helpers are deprecated. Future Codex sessions should check current Supabase docs before changing this.

Reference:

- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/auth/quickstarts/nextjs
- https://supabase.com/docs/guides/troubleshooting/how-do-you-troubleshoot-nextjs---supabase-auth-issues-riMCZV

## Login Behavior

The login form should:

- accept email and app password
- call Supabase Auth email/password sign-in
- redirect authenticated users to `/dashboard` or a safe internal `next` path
- show clear errors without exposing raw credentials or secrets
- use browser autocomplete hints such as `username` and `current-password`

Stage 2.3 implements login with a Server Action that calls `supabase.auth.signInWithPassword()`. Invalid credentials return a safe generic message. The form includes no signup link or magic-link action.

## Password Recovery Behavior

Password recovery is allowed for the controlled owner account, but it is not a public signup path.

The current `/login` client form can handle a Supabase recovery link that returns with recovery tokens in the URL hash. It sets the temporary recovery session through the Supabase browser client, removes the token hash from the visible URL, lets the owner enter a new password, calls `supabase.auth.updateUser({ password })`, then signs out locally and shows the normal login form again.

Do not print, store, document, or commit recovery URL tokens. If this flow is changed, keep it on the existing login-only auth path unless a new auth decision is documented.

## Logout Behavior

Logout should:

- call Supabase Auth sign out
- clear the active Supabase session/cookies through the recommended Supabase client behavior
- redirect to `/login`
- leave private pages inaccessible after logout

Stage 2.3 implements logout with a Server Action that calls `supabase.auth.signOut({ scope: "local" })` and redirects to `/login`.

## Protected Routes

All app routes containing private workout data must require authentication.

Protected route checks should be done server-side where possible. Do not trust client-only hiding. Data access must also be protected by Supabase Row Level Security, not only by Next.js route guards.

Stage 2.3 protects `/dashboard`, `/workouts`, `/workouts/new`, `/exercises`, `/progress`, and `/settings` in `proxy.ts`, and each protected page also calls `requireAuth()` server-side. The `/workouts` protected prefix also covers `/workouts/[sessionId]`, added in Stage 3.3 for set entry. Stage 5 adds the protected `/cardio` prefix, which covers `/cardio` and `/cardio/new`. The 2026-06-27 local preview update adds protected `/history` as a combined read-only history overview. If Supabase environment variables are missing, protected routes fail closed and redirect to `/login`.

## Session Persistence

Use the normal Supabase session/cookie mechanism for persistence across browser restarts and devices. Do not manually store credentials.

For multi-device use, each device should log in with the same Supabase user account. Supabase Postgres is the single source of truth for saved data.

## Redirect URLs

Local development and production redirects must both be configured deliberately in Supabase Auth settings.

Typical development URL:

- `http://localhost:3000`
- `http://localhost:3000/auth/callback`

Current production URL:

- `https://personal-training-website-v2.vercel.app`
- `https://personal-training-website-v2.vercel.app/**`

Do not assume a localhost login test proves iPhone production behavior. Browser sessions can differ between in-app browsers, Chrome, Safari, and Vercel production.

During the 2026-06-20 production link setup, Supabase Auth URL configuration was updated for Version 2:

- Site URL: `https://personal-training-website-v2.vercel.app`
- Redirect URL: `http://localhost:3000/**`
- Redirect URL: `http://localhost:3000/auth/callback`
- Redirect URL: `https://personal-training-website-v2.vercel.app/**`

The old `setline-personal-training` production redirect URL was removed. Email/password login does not require an auth callback redirect, but these URL settings keep password recovery and any future callback-based flows pointed at the Version 2 site.

## Environment Variables

Version 2 uses the current Supabase publishable key convention for client-safe environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Legacy projects may use this older variable name only if the selected Supabase project does not yet have publishable keys configured:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Never expose:

- Supabase service role key
- secret keys
- account passwords
- cookies or tokens copied from browser/devtools

## Common Mistakes To Avoid

- Mixing several auth patterns in the same app.
- Using deprecated auth helper packages without a strong reason.
- Treating localStorage as a password or credential store.
- Exposing service role keys to the frontend.
- Protecting UI routes but forgetting Row Level Security.
- Assuming old Supabase test users or old app data are production truth.
- Depending on localhost sessions for iPhone behavior.
- Adding public signup before the personal app boundary is stable.
- Adding magic-link login as the primary flow after deciding to use password login.
- Changing callback URLs in code without updating Supabase Auth settings.
