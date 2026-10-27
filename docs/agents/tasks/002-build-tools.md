# Task 002: build tools on the dev machine

- **Status:** ready (blocked: two findings for the owner, see Result)
- **Branch and worktree:** `task/002-build-tools` from `main` (1224ad8), in the main clone
  (records only, no code)
- **Hand-off:** supervisor
- **Shares:** nothing; task 003 needs Go and Node.js from it
- **Your time:** ~10 min (two fixes on the dev machine)
- **Who:** You -> Claude
- **Waits on:** the owner's fixes for the Android SDK layout and the JDK

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
- Left for the owner: move the command-line tools into `cmdline-tools\latest`, and either install
  Temurin 21 with `JAVA_HOME` set or keep 25 and set `JAVA_HOME` to it.
