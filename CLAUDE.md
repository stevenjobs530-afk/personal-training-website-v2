# CLAUDE.md

This file is for Claude Code when working in this repository.

## Operating Context

- Project path: `/Users/stevenjobs/Downloads/personal-training-website-v2`
- GitHub repository: `https://github.com/stevenjobs530-afk/personal-training-website-v2`
- Default branch: `main`
- The GitHub repository is currently public so external coding assistants can read source code.
- The deployed app is still private in product behavior: private training data must remain behind Supabase Auth and Row Level Security.

If `pwd` is not `/Users/stevenjobs/Downloads/personal-training-website-v2`, stop and ask for the correct folder before making claims or edits.

## Required Startup Checks

Before making code changes, run or inspect:

```bash
pwd
git status --short --branch
git remote -v
```

For major changes, read `AGENTS.md` first, then follow its required reading order:

1. `ARCHITECTURE.md`
2. `AUTH_FLOW.md`
3. `DATABASE_SCHEMA.md`
4. `DECISIONS.md`
5. `TASK_HISTORY.md`
6. `ROADMAP.md`

For a small targeted edit, still inspect the relevant existing files before proposing or changing code.

## Collaboration Role

Claude Code may act as the implementation lead for local code changes.

Codex is the review and quality gate. If a requested change conflicts with `AGENTS.md`, security boundaries, auth rules, database/RLS expectations, or the user's stated request, pause and hand off to Codex or the user instead of forcing a change.

If Claude Code gets stuck on the same issue, cannot verify a claim, or keeps proposing changes that do not solve the user's actual problem, stop and hand the decision back to Codex or the user. Do not loop.

If terminal work is not enough, the user may allow Claude's Computer Use feature to assist, but the same safety boundaries still apply: no secrets, no owner password handling, no unreviewed live database mutations, and no unapproved GitHub pushes.

Do not claim a change is complete unless the current worktree proves it through `git diff`, `git status`, file inspection, and available checks.

## Safety Boundaries

- Do not read, print, store, commit, or paste secrets, cookies, passwords, tokens, recovery links, or service-role keys.
- `.env.local` is intentionally ignored. Do not commit it or copy its values into docs.
- Do not add public signup in Version 1.
- Do not change authentication flow without updating `AUTH_FLOW.md`.
- Do not change database schema without updating `DATABASE_SCHEMA.md` and designing RLS first.
- Do not run destructive git commands, force push, change GitHub visibility, or push to GitHub unless the user explicitly asks.
- Do not mutate live Supabase data directly unless the user explicitly asks and the operation is reviewed first.
- User-owned database rows, such as duplicate exercises, are data issues. Local file edits alone will not remove them from Supabase.

## Verification

Before finishing code changes, run:

```bash
npm run lint
npm run build
```

If a check cannot be run, say exactly why. For UI changes, prefer a real browser or screenshot check in both mobile-sized and desktop-sized views when practical.

## Reporting

Keep reports short and concrete:

- what files changed
- what checks ran
- what remains unverified
- whether anything needs owner action, such as login, Supabase data cleanup, or manual QA

If the task is uncertain, stop early and ask. Do not loop.
