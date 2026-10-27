# Task 006: inventory of Donetick against the brief

- **Status:** delegated
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

- In progress.
