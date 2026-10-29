# Plan

A task moves through: proposed, ready, delegated, done (closed in its own branch before the
push), and live (deployed by the owner).

The product is described in `docs/BRIEF.md`.

## Milestones

| # | Milestone | Status |
|---|---|---|
| 0 | Setup: record, Codex hand-off, build tools on the dev machine | Done |
| 1 | Fork and rebrand: Donetick imported, builds and tests green, renamed Wuzzanext, logo everywhere, source link in the app | In progress (003 done) |
| 2 | Family profiles: name, avatar, color, 4-digit PIN, quick person switcher | Proposed |
| 3 | Chores: one-time/recurring, rotation, instructions and pictures, photo proof with thumbs-up, points and weekly leaderboard, simple fun UI | Proposed |
| 4 | Meals: recipe picker from the local recipes page, meal entries, week view, cook's to-do, polls, shopping list | Proposed |
| 5 | Android app: APK, offline copy, outbox sync on reconnect, conflict rule, due-task reminders | Proposed |
| 6 | First release on the home server (owner deploys a merged hash) | Proposed |

**Designs that contain private details** (personal data, private lists, account details) stay
outside the repo. When a milestone starts, the owner provides the part needed; the supervisor
writes the design into `docs/` without those details and deletes the copy it was sent, because
everything on the dev machine is readable by Codex.

## Tasks

| # | Task | Status | Shares |
|---|---|---|---|
| 001 | Dev machine setup check; brief and plan into docs | Done | Nothing |
| 002 | Build tools on the dev machine (Go, Node, JDK, Android SDK), installed by the owner | Done | Nothing |
| 003 | Import Donetick backend and frontend at pinned upstream releases (keeping history), build, run tests | Done | Everything after |
| 004 | Rebrand to Wuzzanext: names, texts, AGPL notice and "source code" link (About page); PostHog and Plus/payment removed | Done | 003 |
| 005 | Logo: transparent PNG, app icon, favicon, Android launcher icons | Done (PR) | 004 |
| 006 | Inventory: what Donetick already does against the brief (recurrence, rotation, points, photos, approvals, notifications), gap list | Done | 003 |
| 007 | Profiles with avatar and color; 4-digit PIN sign-in; person switcher | Done (PR) | 003 |
| 008 | Chore content: instructions, "done means" text, pictures | Done (PR #13, merged) | 006 |
| 009 | Photo proof and thumbs-up approval by the assigner | Done (PR #14, merged) | 006, 008 |
| 010 | Points and weekly leaderboard: 1 star per new chore, the household's calendar week (Monday by default) | Done (PR open) | 006 |
| 011 | Simplified fun UI pass: icons, little text, few options | Proposed | 007-010 |
| 012 | Recipe reader for the local recipes page (from owner-provided sample pages), ingredients and servings | Waits on samples (owner, later) | 003 |
| 013 | Meals: add meal, week view, cook's to-do entry | Proposed | 012 |
| 014 | Meal polls: up to 3 recipes, chosen voters, majority, random tie-break | Proposed | 013 |
| 015 | Shopping list from planned meals, scaled to servings | Proposed | 012, 013 |
| 016 | Android APK build (signed by the owner), home-server address setting | Proposed | 005 |
| 017 | Offline copy and outbox sync with the conflict rule (decided 2026-10-26); one queue per person, so a forced sign-out on session expiry keeps queued changes (STATUS open item 5) | Proposed | 016 |
| 018 | Due-task reminders as local phone notifications | Proposed | 016, 017 |
| 019 | Home-server packaging as a Windows service behind Nginx Proxy Manager, first deployment | Proposed | all, 020 first |
| 020 | Source archive of the exact commit packaged into each build, offered on the About page (AGPL, private repository) | Approved (2026-10-26), before 019 | 004 |
| 021 | Remove unused PostHog, RevenueCat and Stripe packages; README brought up to date | Done | 004 |
| 022 | Arabic: full right-to-left layout (the one-tap toggle is in the user menu since 007), missing Arabic texts filled in; the owner reviews the Arabic wording before merge | Done (PR #11, merged) | 007 |
| 024 | Menu items hidden from regular users: Archived, Things, Labels, Report an Issue hidden by default; admins switch each on or off for all regular users (household setting); pages not blocked | Done (PR #10, merged) | 007 |
| 023 | Translate chore names, chore details and recipe names English <-> Arabic on the home server (Google Cloud Translation, cached; key only in the server's configuration) | Done (PR #12, merged) | 022 |
| 025 | Optional server listen address (`server.host`): empty listens on every interface as today; the local test app uses 127.0.0.1, the home server sets it in 019 (approved 2026-10-28) | Done (PR open) | 003 |

## Settled: don't propose these again

- 2026-10-26: the name is Wuzzanext, not Wuzzanikist (owner, through the orchestrator).
- 2026-10-26: project, folder and repository are all `wuzzanext` (owner, through the
  orchestrator).
- 2026-10-26: plan approved; build now, recipe samples later (owner, through the
  orchestrator).
