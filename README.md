# Wuzzanext

A family app for chores and meal planning, run on a home server and used from a web browser
or an Android app. It is a fork of [Donetick](https://github.com/donetick/donetick), renamed
and reshaped for one family: fun and simple, few options, little text.

## Profiles and PIN sign-in

Admins can use Settings > Family to show Archived, Things, Labels and Report an Issue for regular members. All four are hidden by default; admins always see them.

The sign-in screen shows household faces. Tap a person and enter their four-digit
PIN; admins can also use the password link as a backup. Empty or unavailable profile
lists fall back to password sign-in. In Settings → Profile, choose a colour and
English or Arabic, change your PIN, or enable **Shared tablet** on this device.
Shared tablets return to faces after five minutes without touch or keyboard input,
including time in the background. Switching waits for queued offline changes to sync.
The device's language remains the fallback when signed out.

The app has full Arabic texts and switches to right to left with the language switch in the user menu.

Chore names and details can also be shown in the reader's language (English or Arabic) through
Google Cloud Translation, called only by the home server. It is off by default; the owner's
setup steps are in `docs/translation-setup.md`.

Household admins can add people and reset PINs in the **Family** section of Profile
settings. Set `household.circle_id` in the server configuration to the household's
circle ID. With no value, the server uses the only circle if exactly one exists;
otherwise the faces list is empty until a household is configured.

## License and origin

Wuzzanext is a modified version of Donetick, and like Donetick it is licensed under the
[GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html). The
upstream license and copyright notices are kept (`backend/LICENSE.md`,
`frontend/LICENSE.md`). This repository is private, so every running copy offers its exact
source instead: the app's About page (`/about`, reachable without signing in) links to
`/wuzzanext-source.tar.gz` on the same server. Task 020 builds that archive into each
release; until it lands, the link answers 404.

Changes from Donetick so far: the Wuzzanext name, app id `com.wuzzanext.app` and link scheme
`wuzzanext://`; no analytics (PostHog, Plausible); no paid "Plus" tier or purchases (Stripe,
RevenueCat), so every account has every feature; no links to Donetick's hosted service,
stores or community.

## Repository layout

| Path | What it holds |
|---|---|
| `backend/` | Go server (module `donetick.com/core`), imported from Donetick v0.1.83. Entry point `main.go`; features under `internal/`; settings in `config/` |
| `frontend/` | React (Vite) web interface, imported from Donetick web v1.2.62. Source in `src/`, node tests in `tests/` |
| `frontend/android/` | Capacitor Android app that wraps the web interface (`com.wuzzanext.app`) |
| `frontend/ios/` | Upstream iOS project, unchanged and not built for this project |
| `assets/logo/` | The owner's original logo (`logo-original.jpg`), its two transparent cut-outs (`logo-tile.png` for icons, `logo-character.png` for in-app graphics) and the scripts that make them and every app icon (task 005) |
| `docs/BRIEF.md` | What the family asked for: the build brief |
| `docs/INVENTORY.md` | What Donetick already did against the brief (snapshot from before the rebrand) |
| `docs/agents/PLAN.md` | Milestones and the numbered task list with each task's status |
| `docs/agents/STATUS.md` | Current state: what is live, in flight, open, and every decision taken |
| `docs/agents/tasks/` | One file per task: goal, limits, steps and the result |
| `AGENTS.md`, `CLAUDE.md` | Working rules for the coding agents and the supervisor |

Both `backend/` and `frontend/` were imported with `git subtree`, so upstream history is
kept. A later upstream release comes in with
`git subtree pull --prefix=<folder> <upstream url> <tag>`.

## Build, test and run locally

Tools: Go 1.24 or newer, Node.js 24 with npm, and for the Android app JDK 21 and the Android
SDK (`ANDROID_HOME`).

Server, from `backend/`:

```sh
go build ./...
go vet ./...      # one known upstream finding: internal/realtime/pool.go:218
go test ./...
```

Web interface, from `frontend/`:

```sh
npm ci
npm run build                      # output in frontend/dist
npm run lint                       # eslint, prettier, i18n audit; must exit 0
node --test "tests/*.test.mjs"     # one known upstream failure: task-editor-compatibility
```

To run it on your own machine:

1. Copy `backend/config/selfhosted.yaml.example` to `backend/config/selfhosted.yaml` (git
   ignores it) and set your own `jwt.secret`. The database is SQLite by default.
2. Start the server from `backend/` with `DT_ENV=selfhosted go run .` (PowerShell:
   `$env:DT_ENV='selfhosted'; go run .`). It listens on port 2021.
3. Start the web interface from `frontend/` with `npm run dev` and open the address Vite
   prints. It talks to the server at `http://localhost:2021` (`frontend/.env.development`).

For a single server that also serves the web interface, copy the contents of
`frontend/dist` into `backend/frontend/dist` before building the server; it embeds that
folder and serves it when `server.serve_frontend` is true.

App icons and splash screens all come from the owner's logo. After `npm ci` in `frontend/`,
run from the repository root `node assets/logo/make-logo.mjs` (the two cut-outs) and then
`node assets/logo/make-icons.mjs` (web icons in `frontend/public/`, the in-app logo
`frontend/src/assets/logo.png`, Capacitor sources in `frontend/resources/`, Android launcher
icons and splash screens). Check the results by eye before committing them.

The Android app: `npm run android` in `frontend/` builds the web interface and syncs it into
`frontend/android`; Gradle builds the APK from there. Signing keys never live in this
repository (task 016).

## Deployment

Planned, not live yet (task 019): the server runs as a Windows service on the family's home
server, behind the home network's reverse proxy (Nginx Proxy Manager) with HTTPS, reachable
on the home network only. Data and uploaded pictures stay on that server's local storage.
Host names and secrets live in the server's own configuration, never in this repository.
The owner deploys a merged commit, named by its full hash.

## Current state

See `docs/agents/STATUS.md` for the details and `docs/agents/PLAN.md` for what comes next.
In short: Donetick is imported and builds, rebranded, without analytics or payments, with the
family's logo (task 005). Family profiles with PIN sign-in (007), Arabic with right-to-left
layout (022), translated chore texts (023), chore instructions with pictures (008) and photo
proof with a thumbs up from whoever gave the chore (009) are in, and so are stars for every
new chore with a leaderboard for the household's week, Monday to Sunday by default (010).
Nothing is deployed yet. Next come the simpler interface, the Android APK, offline use and
reminders. The meal-planning tasks wait for
sample recipe pages.
