# Task 003: import Donetick at pinned releases

- **Status:** in progress
- **Branch and worktree:** `task/003-donetick-import` from `task/002-build-tools` (58e2e16),
  in `C:\dev\wt\wuzzanext-003-donetick-import`
- **Hand-off:** supervisor for the import (needs network); Codex for any build fixes
- **Shares:** everything after it builds on this
- **Your time:** ~15 min (review and merge)
- **Who:** Claude -> Codex (if fixes are needed) -> You
- **Waits on:** nothing

## Goal

The Donetick server and web interface live in this repository, with their upstream history, at
pinned releases, and they build and pass their own tests on the dev machine. Nothing is renamed
yet (task 004).

## Read first

- `docs/BRIEF.md`, `docs/agents/PLAN.md` (milestone 1).
- Upstream: `https://github.com/donetick/donetick` (Go server) and
  `https://github.com/donetick/frontend` (React/Vite web interface with the Capacitor Android
  app). Both AGPL-3.0 (`LICENSE.md`).

## Limits that apply

- Upstream code, lock files and licence files are imported unchanged. Any fix needed to build
  goes in its own commit after the import, and is listed in the Result.
- No network for Codex: the supervisor fetches modules and packages before a hand-off.

## Pinned releases

| Part | Upstream tag | Commit | Date | Folder here |
|---|---|---|---|---|
| Server | `v0.1.83` | `549e44c836de6b54f026624ccce9d6e8df726a30` | 2026-10-18 | `backend/` |
| Web interface | `v1.2.62` | `6849b3acd3944b33a0272bf7fb261d7a131fa5b2` | 2026-10-20 | `frontend/` |

Latest stable (non-beta) tags on 2026-10-26. Imported with `git subtree add` without
`--squash`, so upstream history is kept and later upstream releases can be merged with
`git subtree pull`.

## What to do

1. `git subtree add --prefix=backend https://github.com/donetick/donetick.git v0.1.83`.
2. `git subtree add --prefix=frontend https://github.com/donetick/frontend.git v1.2.62`.
3. Server: `go mod download`, `go build ./...`, `go test ./...` in `backend/`.
4. Web interface: `npm ci`, `npm run build`, `npm run lint`, `node --test tests/` in
   `frontend/`.
5. Fix only what keeps the build or tests from running on this machine; record the rest.

## Acceptance

- Both subtree imports carry upstream history; the trees match the pinned tags exactly.
- `go build ./...` succeeds; `go test ./...` passes, with counts.
- `npm run build` succeeds; `node --test tests/` passes, with counts; lint result recorded.

## Result (filled in before the push, in the task's own branch)

- In progress. Steps 1 and 2 done on 2026-10-26: `a1a8c93e` (server) and `6f2c1884` (web
  interface); both trees match the pinned tags exactly (`backend` 23a8265, `frontend` 4fa5f22).
- Blocked at step 3: the supervisor's permission check denied running the imported code
  (`go mod download && go build ./... && go test ./...`, reason "Code from External"). Building
  and testing upstream code needs the owner's permission rule; nothing was worked around.
  `npm ci`/build/tests (step 4) need the same.
