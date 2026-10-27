# Task 004: rebrand to Wuzzanext

- **Status:** ready
- **Branch and worktree:** `task/004-rebrand` from `main` (c6dd678), in
  `C:\dev\wt\wuzzanext-004-rebrand`
- **Hand-off:** Codex (default model): one read-only planning run, then three writing runs,
  one per commit (rename, analytics removal, Plus/payment removal). The supervisor reviews
  and commits each.
- **Shares:** `frontend/` and `backend/` with every later task; 005 (logo) builds on it
- **Your time:** ~20 min (review three commits, merge). One open question: the repository
  must be public for the "source code" link to work.
- **Who:** Claude -> Codex -> Claude -> You
- **Waits on:** nothing to start; the owner's answer on the public repository before the link
  works for the family

## Goal

The app says Wuzzanext everywhere a family member can see it: web title, app name, Android
app name and ID, emails and notifications. It no longer points to Donetick's hosted service,
store pages or community. It keeps Donetick's AGPL-3.0 license and credits Donetick, and
every user (signed in or not) can find a "Source code" link to this fork. It sends no
analytics and has no paid "Plus" tier or purchase screens: every account has every feature.

## Read first

- `docs/BRIEF.md` (Starting point; Look and feel), `AGENTS.md`.
- The inventory from task 006: the sections "Outside connections", "Plus and paywall
  gating" and "Branding to change (task 004)". It is not on this branch yet (its pull
  request is still open); the supervisor gives its path in the prompt.

## Limits that apply

- No network; don't run builds, tests, npm or go. The supervisor runs them.
- Don't change: lock files and module files (`frontend/package.json`,
  `frontend/package-lock.json`, `backend/go.mod`, `backend/go.sum`), license files, APK
  signing setup, `docs/agents/`, `CLAUDE.md`, `AGENTS.md`. Unused dependencies stay listed;
  removing them is a later owner decision.
- Keep upstream copyright and license notices. Credit Donetick as the base ("Based on
  Donetick"), linking to `https://github.com/donetick/donetick`.
- Keep internal names that users don't see: the Go module path `donetick.com/core`, Go
  package names, persisted storage names (`donetick_offline` and similar keys), event names.
- Logo and icon images stay as they are; task 005 replaces them.
- Don't add new outside connections. Nothing private in code or tests.

## Decisions taken by the supervisor (defaults, owner can change)

- Product name: `Wuzzanext`. Android `appId`/`applicationId`/namespace: `com.wuzzanext.app`,
  with the Java package moved to match. URL scheme: `wuzzanext://`.
- The verified Android app link to `app.donetick.com` is removed (the app has no hosted
  site).
- Source link: `https://github.com/abadran101/wuzzanext`. License link: the AGPL text in the
  same repository (`https://github.com/abadran101/wuzzanext/blob/main/backend/LICENSE.md`; there is
  no root license file).
- The marketing site (`MarketingApp.jsx`, landing pages) is not served: the app always opens
  the app. Removing the marketing files themselves is optional; not routing to them is
  required.

## What to do

Commit 1, rename and links:

1. Replace user-visible "Donetick"/"donetick" product naming with Wuzzanext: page title, PWA
   name and short name, logo alt text, translations, email subjects and templates,
   notification titles, Android app name and strings.
2. Android identity: `capacitor.config.ts` `appId`/`appName`, `android/app/build.gradle`
   namespace and `applicationId`, `strings.xml`, the Java package directory and its
   `package` line, manifest scheme. Update every producer and consumer of the URL scheme
   together (`CapacitorListener.js`, `NFCWriter.jsx`, OAuth redirect handling).
3. Links: remove or repoint hosted Donetick links (docs, privacy, terms, store, community,
   translation site, invite base URL, feedback and error-report GitHub issue links, store
   review prompts). Invite links use the app's own configured address. Remove the
   marketing redirect and host-based marketing bundle selection in `main.jsx`.
4. AGPL notice: a "Source code" link and a "License (AGPL-3.0)" link, plus the "Based on
   Donetick" credit, visible without signing in (sign-in page footer) and when signed in
   (for example an About entry in Settings). Small and unobtrusive.
5. Remote resources in email templates (Google Fonts, CDN images) are removed.

Commit 2, analytics:

6. Remove PostHog from the web interface: `frontend/src/analytics/` and every call into
   it, the analytics/crash consent settings UI, and `getPosthogSourcemapConfig` in
   `vite.config.mjs`. Remove the inline Plausible script in `index.html`.

Commit 3, Plus and payment:

7. Server: every account is fully entitled. `User.IsPlusMember` (and any similar check)
   returns true for every user, children included; `RequirePlusMemberMiddleware` no longer
   blocks. Stop registering payment routes (Stripe, RevenueCat, in-app purchase webhooks)
   and remove the `backend/external/payment` package if that leaves `go build` clean.
   Self-hosted users no longer need the fake 2999-12-31 expiry if nothing reads it.
8. Web: remove purchase UI (`SubscriptionModal`, `NativePaywall`/RevenueCat,
   `PaywallContext` purchase flows) and every "Plus" badge, upsell and limit message;
   entitlement helpers (`entitlements.js`, `isPlusAccount`) allow everything.
9. Update or remove tests that cover what was removed; keep the rest passing.

## Acceptance

- `go build ./...`, `go vet ./...` (no new findings beyond the known
  `internal/realtime/pool.go:218`) and `go test ./...` pass in `backend/`.
- `npm run build` and `npm run lint` pass in `frontend/` (no new errors);
  `node --test "tests/*.test.mjs"` has no new failures (one known upstream failure).
- Search for `donetick` (case-insensitive) in user-visible strings finds only the credit,
  license notices and the kept internal names, each listed in the Result.
- No `posthog`, `plausible` or `wannaknow` reference left in `frontend/src` or
  `frontend/index.html`; no Stripe or RevenueCat calls left in source.
- Three separate commits as above.

## Result (filled in before the push, in the task's own branch)

- 
