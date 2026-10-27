# Task 006: inventory of Donetick against the brief

- **Status:** done (2026-10-26)
- **Branch and worktree:** `task/006-inventory` from `main` (c6dd678), in
  `C:\dev\wt\wuzzanext-006-inventory`
- **Hand-off:** Codex (default model), writes `docs/INVENTORY.md` only; supervisor checks claims
  against the code
- **Shares:** nothing; tasks 004 and 007-011 use its result
- **Your time:** ~10 min (read the inventory, merge)
- **Who:** Claude -> Codex -> Claude -> You
- **Waits on:** nothing

## Goal

A written map of what Donetick (imported in task 003) already does for each point of
`docs/BRIEF.md`, what is partly there, and what is missing, plus every place the app talks to a
cloud service, sends analytics or gates features behind the paid "Plus" tier. Later tasks plan
from this instead of re-reading the code.

## Read first

- `docs/BRIEF.md`, `docs/agents/PLAN.md`, `AGENTS.md`.
- `backend/` (Go server, Donetick v0.1.83) and `frontend/` (React/Vite web interface with the
  Capacitor Android app, v1.2.62).

## Limits that apply

- Read only, except for writing `docs/INVENTORY.md`. No code changes.
- No network. Don't run builds, tests or package managers.
- Every claim names a file (and a function, component or line) that shows it.

## What to do

1. For each point of the brief, say: **have**, **partly** or **missing**, with the evidence
   (path and symbol) and one line on the gap.
2. List every outside connection: analytics (PostHog or other), crash reporting, cloud push
   (FCM, APNs), OAuth/identity providers, payment/subscription, update checks, CDNs or fonts
   loaded from the internet, telemetry, hosted-service URLs (donetick.com etc.). For each:
   where it's configured, whether it's on by default for a self-hosted build, and how to turn
   it off.
3. List the Plus/paywall gating: each gated feature, where the check is (server and web), and
   what a self-hosted user sees today.
4. List branding to change in task 004: app names, package IDs (Android `appId`), titles,
   icons, links, the AGPL notice and any "source code" link.
5. Summarise in a short table at the top.

## Acceptance

- `docs/INVENTORY.md` covers every brief point and the three lists, each claim with a path.
- The supervisor spot-checks at least ten claims against the code.

## Result (filled in before the push, in the task's own branch)

- **Commits:** `5b26e500008d589589b5ebd0a7b3faf891be6f0c` (task file), then the inventory and
  this closing record.
- **Inventory:** `docs/INVENTORY.md`, written by Codex (codex-cli 0.163.0, default model,
  workspace-write, one file changed). Static review only; nothing was built or run.
- **Spot-checked by the supervisor (13 claims, all confirmed):** self-hosted users get Plus
  expiry 2999-12-31 (`backend/internal/user/repo/repository.go`); approval requires circle admin
  or manager (`ApproveChore`); leaderboard defaults to 7 days (`UserPoints.jsx`); native
  offline cache is SQLite (`OfflineDB.js`, `SQLiteBackend`); empty `storage_type` selects S3
  (`storage/factory.go`); the Plausible script only runs on `donetick.com` (`index.html`);
  Android `appId` `com.donetick.app` (`capacitor.config.ts`); child passwords 8-64 characters
  (`CreateChildUserRequest`); `IsPlusMember` special-cases child users (`user/model`); FCM off
  with an empty project ID (`fcm.go`); uploads require `IsPlusMember` (`AddMediaRecord`); local
  notifications capped at 64 (`LocalNotificationScheduler.js`); no recipe, meal or shopping
  code (only an icon name and a landing-page demo match).
- **Main findings:**
  - Have: recurrence, rotation on completion, points and a 7-day leaderboard, local due
    reminders, offline cache with an outbox and reconnect sync.
  - Partly: profiles (no color), switching (admin impersonation only), instructions (no "done
    means" field), photo proof (no per-completion photo), approval (by role, not by assigner),
    APK (upstream config).
  - Missing: 4-digit PIN, all meal planning, last-change-wins conflicts (upstream rejects stale
    edits with 409).
  - Outside connections, all off by default when self-hosted except where noted: PostHog,
    Plausible (only on donetick.com), FCM, Donetick Bridge, Telegram, Pushover, Discord,
    webhooks, SMTP/SMTP2Go, OAuth, Google/Apple sign-in (native plugin enabled in config),
    Stripe (routes still registered), RevenueCat, S3 (the default when `storage_type` is
    empty), hosted links and the Android app link to `app.donetick.com`.
  - Plus gating: self-hosted users already pass, but uploads and some routes check
    `IsPlusMember`, which treats child users differently. Matters for task 007.
- **Left:** tasks 004, 007-011 and 016-019 use these lists. The owner has nothing to do beyond
  review and merge.
