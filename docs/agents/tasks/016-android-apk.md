# Task 016: Android APK and the home-server address

- **Status:** done
- **Branch and worktree:** `task/016-android-apk` from `main` (5231923e), in
  `C:\dev\wt\wuzzanext-016-android-apk`
- **Hand-off:** supervisor (no Codex, STATUS Decisions 2026-10-29)
- **Shares:** sign-in page, push registration, Android build files
- **Your time:** ~45 min once (tools, signing key, backups), then ~5 min per release, plus
  installing on each phone
- **Who:** You (SDK fix, signing answer) → Claude → You (sign, install)
- **Waits on:** nothing (the SDK is installed and readable, and the owner signs on their own
  PC, both 2026-10-29)

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

- Commit c862bc1131e1954580f889df6433636cce033a52:
  - A release without `keystore.properties` is unsigned; the debug-key fallback is gone.
  - `.env.android` (no address, self-hosted) and `npm run android` builds with it. On the app,
    the sign-in page opens the address screen when no address is saved, and an empty address
    is refused when there is nothing to fall back to.
  - `showSocialLogin` is false on the app (and the plugin isn't started); `CLOUD_PUSH_ENABLED`
    is false, so push registration and unregistration return early. The local notification
    permission request stays (018).
  - Version 1.0.0, code 100. Node test `tests/android-build.test.mjs` (3 tests).
- Commit b6146516a85478df0a02782d7ae1fc74ac6f6994: Gradle builds the app and every plugin
  module with SDK 36 and Build-Tools 36.0.0 (Gradle had tried to download Platform 35 and
  Build-Tools 35.0.0; send-intent hardcodes SDK 35). The owner's guide
  `docs/android-signing.md`.
- The last commit: the release block checks for a v2 or v3 signature (with minSdk 28,
  apksigner signs with v3 only); the records.
- APK: `gradlew clean assembleRelease` passed (a build without `clean` failed at R8 with
  missing Capacitor classes, left over from the compile runs that had failed on SDK access).
  - Copied to `C:\dev\scratch\wuzzanext-1.0.0-unsigned.apk`, 76,287,915 bytes, SHA-256
    `ca752bed110fe7057cced052980750ff7674d81083802b6085e9ed054ea2a4ae`.
  - `apksigner verify`: DOES NOT VERIFY (Missing META-INF/MANIFEST.MF), so unsigned as
    intended. `zipalign -c -p 4`: aligned. `aapt2 dump badging`: com.wuzzanext.app, 1.0.0 (100),
    minSdk 28, targetSdk 36. The bundled web files contain no `localhost:2021`.
- Release block tested on the dev machine with a throwaway key in scratch: the paths changed
  to the dev JDK and SDK, and the password given on the command line instead of the prompt.
  - Output: hash matches; verified True; v2 or v3 scheme True; certificate SHA-256 printed;
    copied to the clipboard.
  - A wrong SHA-256 stops it with `STOP: SHA-256 does not match`.
  - The key and test files were deleted afterwards.
  - The setup and key blocks parse (0 errors) but weren't run: they need the owner's
    downloads and prompts.
- Checks: `npm run build` ok; `npm run lint` exit 0 (0 errors, 1897 warnings, unchanged),
  i18n audit ok; node tests 47/48 (the known upstream `task-editor-compatibility` failure);
  `go build` ok, `go vet` only pool.go:218, `go test ./...` 27 packages ok.
- Not checked here (no emulator or phone): the first-launch address screen, hidden sign-in and
  PIN sign-in on a real phone. The owner's first install is that check.
- For the owner: the one-time setup and key in `docs/android-signing.md`, then sign
  `wuzzanext-1.0.0-unsigned.apk` with the release block (the SHA-256 above) and install it on
  one phone. The APK is about 76 MB; it carries upstream plugins (OCR, local AI) as they are.
- The SDK folder's ACL still lists the inherited "Agents: Deny FullControl" entry, and a small
  Java test of a zip file system on an SDK jar still fails on close; Gradle's compile passes
  since the owner's fix.
