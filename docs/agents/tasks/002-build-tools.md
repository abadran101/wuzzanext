# Task 002: build tools on the dev machine

- **Status:** done (2026-10-26)
- **Branch and worktree:** `task/002-build-tools` from `main` (1224ad8), in the main clone
  (records only, no code); reaches `main` with task 003's pull request
- **Hand-off:** supervisor
- **Shares:** nothing; task 003 needs Go and Node.js from it
- **Your time:** ~10 min (two fixes on the dev machine)
- **Who:** You -> Claude
- **Waits on:** nothing

## Goal

The dev machine has every tool needed to build Wuzzanext: Go and Node.js for the Donetick server
and web interface, a JDK and the Android SDK for the Android app.

## What to do

1. The owner installs Go, Node.js LTS, Temurin JDK 21 and the Android SDK command-line tools.
2. The supervisor checks each from its session and records the versions. Nothing is installed by
   agents.

## Acceptance

- `go version`, `node --version`, `npm --version`, `java -version` and `sdkmanager --version`
  answer from the supervisor's session; `JAVA_HOME` and `ANDROID_HOME` are set.

## Result (filled in before the push, in the task's own branch)

Checked from the supervisor's session on 2026-10-26 (PATH re-read from the user and machine
scopes, since the session started before the installs):

| Tool | Found | Verdict |
|---|---|---|
| Go | go1.27.3 windows/amd64, `C:\Program Files\Go\bin` | OK |
| Node.js | v24.22.1, `C:\Program Files\nodejs` | OK |
| npm | 11.19.1 | OK |
| JDK | Temurin **25.0.5** LTS, not 21; `C:\Program Files\Eclipse Adoptium\jdk-25.0.5.8-hotspot` | Owner decides |
| `JAVA_HOME` | not set in any scope | Missing |
| `ANDROID_HOME` | `C:\tools\Android`, machine scope | OK |
| `sdkmanager` | cmdline-tools 22.0 unpacked at `C:\tools\Android\cmdline-tools\bin`, not `...\cmdline-tools\latest\bin`; it fails with "Could not determine SDK root" | Fix needed |

- Go and Node.js are enough for task 003 (Donetick server and web interface).
- The JDK and the Android SDK are needed from task 016 (Android APK).
- The owner then moved the command-line tools into `cmdline-tools\latest` and installed Temurin
  21 with `JAVA_HOME` set. Re-checked from the supervisor's session on 2026-10-26:
  - `java -version`: Temurin 21.0.12.1 LTS, first on PATH
    (`C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot\bin`).
  - `JAVA_HOME` (machine): `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot\`.
  - `ANDROID_HOME` (machine): `C:\tools\Android`.
  - `sdkmanager --version` from `C:\tools\Android\cmdline-tools\latest\bin`: 22.0 (prints a
    deprecation notice pointing at the new `android` CLI; it still works).
- Temurin 25 is still installed but no longer first on PATH; it can stay.
- Commits: `58e2e16beb7f84a7aed4b7ddec775320d125b038` (first check), then this update on
  `task/003-donetick-import`.
- Nothing left for the owner from 002.
