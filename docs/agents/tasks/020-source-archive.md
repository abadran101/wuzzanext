# Task 020: source archive in each server build

- **Status:** done
- **Branch and worktree:** `task/020-source-archive` from `main` (6e0d7282), in
  `C:\dev\wt\wuzzanext-020-source-archive`
- **Hand-off:** supervisor (no Codex, STATUS Decisions 2026-10-29)
- **Shares:** the server's embedded web files (`backend/frontend/`); 019 packages the binary
  this task builds
- **Your time:** ~5 min (review, merge)
- **Who:** Claude → You
- **Waits on:** nothing

## Goal

Wuzzanext is AGPL and the repository stays private, so every running server offers its own
exact source. One command builds the home-server program with the web interface and a
`git archive` of the exact commit inside it; the About page's "Download source code" link
(task 004) then downloads `/wuzzanext-source.tar.gz` instead of getting 404.

## Read first

- `backend/frontend/handler.go` (embedded web files, the 404 for a missing archive),
  `frontend/src/views/About.jsx`, `frontend/vite.config.mjs` (service-worker deny list),
  README "Build, test and run locally", task 004 Result.

## Limits that apply

- The archive is built only from a committed, clean tree, so it matches the commit exactly.
- No new dependency, no lock-file change. The build leaves the repository as it found it.
- The test app listens on 127.0.0.1 only; made-up accounts only.

## What to do

1. `scripts/build-server.mjs` (Node, built-in modules only): refuse a tree with changes or local
   `.env` overrides; build the web interface in `selfhosted` mode; put it and
   `git archive --format=tar.gz --prefix=wuzzanext-<full hash>/ <hash>` into
   `backend/frontend/dist`; build the Windows server (`CGO_ENABLED=0`, `-trimpath`) into
   `release/`; restore `backend/frontend/dist` to its committed state; print the commit, sizes
   and SHA-256s.
2. A Go test: the archive is served as a gzip download when present, and is 404 (never the app
   shell) when absent.
3. README: how to build a server, the archive, the link.

## Acceptance

- Go build, vet (only pool.go:218), tests; web build, lint (0 errors), node tests (only the
  known upstream failure).
- The built server on 127.0.0.1: the About page link downloads the archive; its top folder is
  the commit's full hash and its files match `git archive` of that commit; the working tree is
  clean after the build.

## Result (filled in before the push, in the task's own branch)

- Commit 329ecc624e380747baa6e457b339f437cbb26d58:
  - `scripts/build-server.mjs`: refuses uncommitted changes and `frontend/.env.local` /
    `.env.selfhosted.local` (both tried: `STOP:` and exit 1). It builds the web interface in
    `selfhosted` mode and embeds it with
    `git -c core.autocrlf=false archive --format=tar.gz --prefix=wuzzanext-<full hash>/`.
    It then builds `release/wuzzanext-<short hash>/wuzzanext.exe` (Windows amd64,
    `CGO_ENABLED=0`, `-trimpath`), copies the archive beside it, restores
    `backend/frontend/dist` and prints the commit, sizes and SHA-256s. `release/` is in a new
    root `.gitignore`.
  - `backend/frontend/handler.go` serves from a swappable `files` (the embedded folder);
    `handler_test.go`: the archive is a gzip download when present, 404 and not the app shell
    when absent, other paths still get the app shell.
  - Node test `tests/source-archive.test.mjs`; README "License and origin" and the build
    section.
- Build of 329ecc62 on the dev machine (exit 0; the tree was clean afterwards, only the
  ignored `release/`):
  - program 146,895,360 bytes, SHA-256
    39fa07396919385303822d00cf2832281ff9bf49f10dc9e8d658ff763ca7903f;
  - archive 25,861,561 bytes, SHA-256
    1b9b225bc2408b0a482045cc2b9bf70b6415b254ede38bae806b6fb700e00d41.
  - Its one top folder is `wuzzanext-329ecc624e380747baa6e457b339f437cbb26d58`, and
    `git get-tar-commit-id` gives the same hash. All 1097 files match the commit's blob hashes
    (0 mismatches).
- Built program as a test app on 127.0.0.1 (Get-NetTCPConnection: 127.0.0.1:2021 only), fresh
  test database, no accounts needed: `/wuzzanext-source.tar.gz` answers 200 with
  `application/x-gzip` and the same SHA-256.
- Browser checks (Playwright 1.59.1, Edge), English and Arabic, 14/14 pass: the About link is
  shown, the direction is right, and the download matches the build's SHA-256, both before
  the service worker is installed and with the About page under its control. No page errors.
- Checks: `go build` ok, `go vet` only pool.go:218, `go test ./...` 28 packages ok; `npm run
  build` ok; `npm run lint` exit 0 (0 errors, 1897 warnings, unchanged), i18n audit ok; node
  tests 48/49 (the known upstream `task-editor-compatibility` failure).
- Notes: the program grows by the archive (about 26 MB); the archive is the whole repository
  at that commit, records included, as approved. A server built any other way still answers
  404 there. 019 uses this script for the package.
- The owner: review and merge the PR.
