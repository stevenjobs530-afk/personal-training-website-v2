# AUTH_FLOW.md

Last updated: 2026-06-20

## Authentication Goal

The app may live at a public Vercel URL, but private gym data must only be available to the authenticated owner. Authentication stability is a top priority because the previous version had repeated login and session problems.

## Auth Provider

Use Supabase Auth with email and password.

Do not build a custom password system. Do not store passwords in localStorage. Do not use magic links as the primary Version 1 login flow unless this decision is deliberately changed and documented.

## Public Signup

Public signup is not part of Version 1.

The owner account should be created manually in Supabase Auth or through another controlled setup. Treat any earlier mention of signup as a future possibility, not a Version 1 requirement.

Do not implement a public signup form in Version 1.

## Planned Routes

- `/login` public login page
- `/auth/callback` callback route if the chosen Supabase flow needs code exchange, password reset, or future email confirmation handling
- `/dashboard` protected
- `/workouts` protected
- `/workouts/new` protected
- `/exercises` protected
- `/progress` protected
- `/settings` protected

Unauthenticated users should only see the login page and any required auth callback handling. Authenticated users should be redirected away from `/login` to `/dashboard`.

## Next.js App Router Session Design

Prefer the current Supabase server-side auth approach for Next.js App Router:

- use `@supabase/ssr`
- use a browser client only in Client Components that need browser-side Supabase calls
- use a server client in Server Components, Server Actions, and Route Handlers
- use cookie/session-based auth suitable for server rendering
- use a Next.js proxy/middleware-style session refresh path so protected routes see a current session

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

## Logout Behavior

Logout should:

- call Supabase Auth sign out
- clear the active Supabase session/cookies through the recommended Supabase client behavior
- redirect to `/login`
- leave private pages inaccessible after logout

## Protected Routes

All app routes containing private workout data must require authentication.

Protected route checks should be done server-side where possible. Do not trust client-only hiding. Data access must also be protected by Supabase Row Level Security, not only by Next.js route guards.

## Session Persistence

Use the normal Supabase session/cookie mechanism for persistence across browser restarts and devices. Do not manually store credentials.

For multi-device use, each device should log in with the same Supabase user account. Supabase Postgres is the single source of truth for saved data.

## Redirect URLs

Local development and production redirects must both be configured deliberately in Supabase Auth settings.

Typical development URL:

- `http://localhost:3000`
- `http://localhost:3000/auth/callback`

Typical production URL:

- `https://your-vercel-project.vercel.app`
- `https://your-vercel-project.vercel.app/auth/callback`

Do not assume a localhost login test proves iPhone production behavior. Browser sessions can differ between in-app browsers, Chrome, Safari, and Vercel production.

## Environment Variables

Client-safe variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Legacy projects may use:

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
