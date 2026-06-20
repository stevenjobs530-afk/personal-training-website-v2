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
