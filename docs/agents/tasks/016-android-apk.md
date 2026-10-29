# Task 016: Android APK and the home-server address

- **Status:** ready (code parts in progress; the APK build waits)
- **Branch and worktree:** `task/016-android-apk` from `main` (5231923e), in
  `C:\dev\wt\wuzzanext-016-android-apk`
- **Hand-off:** supervisor (Codex write runs stay paused, STATUS Decisions 2026-10-28)
- **Shares:** sign-in page, push registration, Android build files
- **Your time:** ~45 min once (tools, signing key, backups), then ~5 min per release, plus
  installing on each phone
- **Who:** You (SDK fix, signing answer) → Claude → You (sign, install)
- **Waits on:** for the APK build only: javac fails with "Access is denied" on the SDK jars: devagent can read every file, but an inherited
  "Agents: Deny FullControl" entry on `C:\tools\Android` blocks the zip file system javac uses (the
  owner has the Tokenmaxximus agent decide whether that is intended and fix it if not). The SDK packages are installed and the
  owner signs on their own PC (both 2026-10-29).

## Goal

The family installs Wuzzanext on Android phones from an APK the owner signs. The app talks
only to the home server: on first launch it asks for the home-server address (the gear on the
sign-in page changes it later). There are no Google/Apple sign-ins and no cloud push.

## Read first

- `frontend/capacitor.config.ts`, `frontend/android/app/build.gradle`,
  `frontend/src/utils/ApiClient.js` (`customServerUrl`),
  `frontend/src/views/Authorization/LoginSettings.jsx`, `LoginView.jsx`,
  `frontend/src/CapacitorListener.js` (push registration).

## Limits that apply

- The signing key and its passwords never go to the dev machine, the repository or any
  message (CLAUDE.md section 3). The owner decides the signing setup.
- No home-server hostname in the repository. No new dependency, no lock-file change.

## What to do

1. Release builds without the owner's `keystore.properties` come out unsigned (no debug-key
   fallback).
2. An `android` build mode with no address built in; the app opens the address screen on
   first launch, and an empty address is refused when there is nothing to fall back to.
3. No Google/Apple sign-in in the app; no cloud push registration (it would crash without
   Firebase, and the no-cloud rule keeps it off). Local notification permission stays (018).
4. Version 1.0.0 (code 100), the first Wuzzanext APK.
5. Gradle uses the installed SDK 36 and Build-Tools 36.0.0 for the app and every plugin module
   (otherwise it tries to download Platform 35 and Build-Tools 35.0.0).
6. The owner's guide `docs/android-signing.md`: one-time tools and key, the release block, installing.
7. After the SDK access fix: build the unsigned APK and its SHA-256; test the release block with a
   throwaway key in scratch.

## Acceptance

- `npm run build`, `npm run lint` (0 errors), node tests (only the known upstream failure).
- An `android`-mode build contains no `localhost:2021`.
- After the SDK fix: `gradlew assembleRelease` gives `app-release-unsigned.apk`; on a phone,
  the first launch asks for the address and PIN sign-in works.

## Result (filled in before the push, in the task's own branch)

- In progress.
