# Task 020: source archive in each server build

- **Status:** ready
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

- (to fill in)
