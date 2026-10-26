# Plan

A task moves through: proposed, ready, delegated, done (closed in its own branch before the
push), and live (deployed by the owner).

The product is described in `docs/BRIEF.md`.

## Milestones

| # | Milestone | Status |
|---|---|---|
| 0 | Setup: record, Codex hand-off, build tools on the dev machine | In progress |
| 1 | Fork and rebrand: Donetick imported, builds and tests green, renamed Wuzzanext, logo everywhere, source link in the app | Proposed |
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
| 001 | Dev machine setup check; brief and plan into docs | In progress | Nothing |
| 002 | Build tools on the dev machine (Go, Node, JDK, Android SDK), installed by the owner | Proposed, waits on owner | Nothing |
| 003 | Import Donetick backend and frontend at pinned upstream releases (keeping history), build, run tests | Proposed | Everything after |
| 004 | Rebrand to Wuzzanext: names, texts, AGPL notice and "source code" link | Proposed | 003 |
| 005 | Logo: transparent PNG, app icon, favicon, Android launcher icons | Proposed | 004 |
| 006 | Inventory: what Donetick already does against the brief (recurrence, rotation, points, photos, approvals, notifications), gap list | Proposed | 003 |
| 007 | Profiles with avatar and color; 4-digit PIN sign-in; person switcher | Proposed | 003 |
| 008 | Chore content: instructions, "done means" text, pictures | Proposed | 006 |
| 009 | Photo proof and thumbs-up approval by the assigner | Proposed | 006, 008 |
| 010 | Points and weekly leaderboard | Proposed | 006 |
| 011 | Simplified fun UI pass: icons, little text, few options | Proposed | 007-010 |
| 012 | Recipe reader for the local recipes page (from owner-provided sample pages), ingredients and servings | Proposed, waits on samples | 003 |
| 013 | Meals: add meal, week view, cook's to-do entry | Proposed | 012 |
| 014 | Meal polls: up to 3 recipes, chosen voters, majority, random tie-break | Proposed | 013 |
| 015 | Shopping list from planned meals, scaled to servings | Proposed | 012, 013 |
| 016 | Android APK build (signed by the owner), home-server address setting | Proposed | 005 |
| 017 | Offline copy and outbox sync with the conflict rule | Proposed, waits on conflict decision | 016 |
| 018 | Due-task reminders as local phone notifications | Proposed | 016, 017 |
| 019 | Home-server packaging and first deployment block | Proposed | all |

## Settled: don't propose these again

- 2026-10-26: the name is Wuzzanext, not Wuzzanikist (owner, through the orchestrator).
