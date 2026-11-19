# Task 027: install by hand, without Tokenmaxximus on the home server

- **Status:** done (branch pushed; PR to be opened by the owner)
- **Branch and worktree:** `task/027-manual-install` from `main` (b1de072f), in
  `C:\dev\wt\wuzzanext-027-manual-install`
- **Hand-off:** supervisor (docs only; a hand-off would cost more than the change)
- **Shares:** the 019/026 deployment spec, owner guide and config template; translation setup
- **Your time:** ~10 min review and merge; then ~45-60 min for the first install
- **Who:** Claude → You (merge) → Claude (package from the merged hash) → You (install)
- **Waits on:** nothing

## Goal

The home server the owner deploys on does not run Tokenmaxximus and will not (owner, in the
supervisor's window, 2026-11-17). The owner installs Wuzzanext by hand: every step in plain
words, with Windows' own tools (Explorer, Services, Registry Editor, Task Scheduler, Windows
Defender Firewall), and one command line typed in an administrator terminal to register the
service. The Google translation key is required, not optional.

## Read first

- `docs/owner-guide.md`, `docs/deployment-spec.md`, `docs/translation-setup.md`,
  `deploy/selfhosted.yaml`, `backend/service_windows.go`, `backend/config/config.go`.

## Limits that apply

- No host names or addresses in the repository; the docs say "the home server".
- No admin paste blocks (portfolio rule). The one exception, approved by the owner in the
  supervisor's window on 2026-11-17: the single `sc.exe create` line, written for the owner to
  read and type, not as a block.
- Secrets (the JWT secret, the Google key) are made and typed on the host only, and go into
  `selfhosted.yaml` in a folder only Administrators, SYSTEM and the service can read.

## What to do

1. Owner guide: replace "Let Tokenmaxximus install it" with the manual first install, in order:
   folders, program and config (secrets and key in the config), service (`sc.exe` line),
   permissions (after the service exists, so its account can be named), service environment
   (Registry Editor) and recovery (Services), start, bind address and firewall, backup task,
   checks. Manual updates and going back.
2. Deployment spec: says what the host ends up with, carried out by the owner by hand;
   secrets in the config file, only non-secret variables on the service.
3. Config template: `jwt.secret` and `translation.api_key` placeholders, translation on.
4. Translation setup: the key is required; step 6 is the owner's manual step.
5. README: the spec line.

## Acceptance

- No "Tokenmaxximus" left in `docs/` (outside `docs/agents/`), `deploy/` or `README.md`.
- The config template with placeholders still fails safe: an unfilled `<JWT_SECRET>` is shorter
  than 32 characters, so the server refuses to start.
- `node scripts/build-server.mjs` still packages the changed files.

## Result (filled in before the push, in the task's own branch)

- Changed: `docs/owner-guide.md` (steps 3-11 and updates by hand), `docs/deployment-spec.md`
  (reference for the owner; secrets in the config, three non-secret service variables, the
  `sc.exe` line, translation check 7), `deploy/selfhosted.yaml` (`<JWT_SECRET>`,
  `<GOOGLE_KEY>`, translation on), `docs/translation-setup.md`, `README.md`.
- Checked: a temporary Go test (not committed) loaded the template through `LoadConfig` with
  `DT_ENV=selfhosted`: unfilled, it refuses to start (JWT secret too short); filled with
  made-up values, translation is on with provider google and the key, host 127.0.0.1. No
  "Tokenmaxximus" left in `docs/` (outside the record), `deploy/` or `README.md` except the
  two lines saying the home server does not run it.
- Not checked: the Windows steps themselves (no host here). Option B of the bind address stays
  a supervisor hand-over if option A fails.
- Owner: merge; then the supervisor builds a package from the merged hash and reports its
  full hash and the `wuzzanext.exe` SHA-256; then the owner guide from step 1.
