# Task 004: rebrand to Wuzzanext

- **Status:** done
- **Branch and worktree:** `task/004-rebrand` from `main` (11e3996), in
  `C:\dev\wt\wuzzanext-004-rebrand`
- **Hand-off:** Codex (default model): one read-only planning run, then three writing runs,
  one per commit (rename, analytics removal, Plus/payment removal). The supervisor reviews
  and commits each.
- **Shares:** `frontend/` and `backend/` with every later task; 005 (logo) builds on it
- **Your time:** ~20 min (review three commits, merge), plus a decision on how the source is
  offered (the repository stays private; see the source-code decision below).
- **Who:** Claude -> Codex -> Claude -> You
- **Waits on:** nothing

## Goal

The app says Wuzzanext everywhere a family member can see it: web title, app name, Android
app name and ID, emails and notifications. It no longer points to Donetick's hosted service,
store pages or community. It keeps Donetick's AGPL-3.0 license and credits Donetick, and
every user (signed in or not) can reach an About page that offers this fork's source. It sends no
analytics and has no paid "Plus" tier or purchase screens: every account has every feature.

## Read first

- `docs/BRIEF.md` (Starting point; Look and feel), `AGENTS.md`.
- `docs/INVENTORY.md` (task 006): the sections "Outside connections", "Plus and paywall
  gating" and "Branding to change (task 004)".

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
- Source code: the repository `abadran101/wuzzanext` stays private (owner, 2026-10-26), so the
  app offers its own source. An in-app About page (route `/about`, no sign-in needed) shows:
  "Wuzzanext, based on Donetick" with a link to `https://github.com/donetick/donetick`; the
  AGPL-3.0 notice with a link to `https://www.gnu.org/licenses/agpl-3.0.html`; and a
  "Download source code" link to the relative path `/wuzzanext-source.tar.gz`, which the
  server serves from its embedded web files (`backend/frontend/handler.go`). In the Android
  app the link uses the configured server address. Packaging that archive (a `git archive`
  of the exact commit, placed in the built web files) is task 020 (approved by the owner
  2026-10-26); until then the link returns "not found".
- Donetick Bridge (hosted push relay): its settings UI and routes are removed. Backend
  Bridge code stays, off by configuration (task 019 sets the outside-service policy).
- iOS (`frontend/ios/`) is not built for this family; leave it unchanged.
- Feedback and error-report links to GitHub issues, the support email and store-review
  prompts are removed (private repository, no store listing). The optional feedback webhook
  stays off unless configured.
- Email: only templates in this repository change; SMTP2Go-hosted templates are out of scope.
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
4. AGPL notice: the About page described above, linked from the sign-in page footer (signed
   out) and from Settings for every signed-in user, children included. Small and
   unobtrusive.
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
- `/about` opens without signing in and shows the credit, the license notice and the source
  download link.
- Three separate commits as above.

## Result (filled in before the push, in the task's own branch)

- **Done** (2026-10-26). Three code commits, each reviewed by the supervisor:
  1. Rename and links (Codex): 2ecdf5bf14440f5ad2eec3e80da09ee7271c74f0. Wuzzanext name in
     texts and locales, Android id `com.wuzzanext.app`, scheme `wuzzanext://`, public About
     page (`/about`) with the Donetick credit, the AGPL-3.0 notice and the source download link
     `/wuzzanext-source.tar.gz` (the server answers 404 until task 020 packages the archive);
     marketing, privacy and terms pages and the Bridge settings removed (`/privacy` and
     `/terms` redirect to `/about`); calendar name Wuzzanext.
  2. Analytics removal (supervisor, Codex hit its usage limit):
     dc6b4ea6658ad2060a9772c2a51bbc1b39e08e76. PostHog code, the Plausible script, the
     "heard about" survey and the privacy-analytics settings removed.
  3. Plus/payment removal (Codex): 358061d9bad0d0309ba2d0d31c5cfcefea4d17cc. `external/payment`
     (Stripe, RevenueCat) deleted with its routes and migrations; every account has every
     feature (`IsPlusMember` is always true); Plus checks on calendar feeds, realtime,
     uploads, webhooks and member/subaccount limits removed; user lookups keep upstream's
     self-hosted queries; web paywall, subscription modal, payment pages and plan sections
     removed. Existing databases keep their old Stripe tables (no data is dropped).
- **Checked** on the final head: `go build ./...` ok; `go vet ./...` only the known
  `pool.go:218`; `go test ./...` 24 packages ok; gofmt clean on changed Go files;
  `npm run build` ok; `npm run lint` exit 0 (0 errors, 1906 warnings, down from 1981);
  `node --test "tests/*.test.mjs"`: only the known upstream failure
  (`task-editor-compatibility.test.mjs`, same assertion as before this task); built bundle
  has no posthog, plausible, Stripe or RevenueCat matches.
- **Left:** task 020 packages the source archive the About page links to. iOS files are
  unchanged. NFC tags and OAuth redirects use the new `wuzzanext://` scheme, so tags written
  for Donetick need rewriting. Calendar event UIDs keep their `@donetick` suffix so existing
  subscriptions don't duplicate events.
- **Owner:** review and merge the PR. Decide on the dependency cleanup (unused PostHog and
  Stripe/RevenueCat packages in `package.json`/`package-lock.json` and `go.mod`/`go.sum`),
  raised separately.
