# Task 003: import Donetick at pinned releases

- **Status:** done (2026-10-26)
- **Branch and worktree:** `task/003-donetick-import` from `task/002-build-tools` (58e2e16),
  in `C:\dev\wt\wuzzanext-003-donetick-import`
- **Hand-off:** supervisor (Codex was at its usage limit when the one fix was needed)
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

- **Commits:**
  - `da5c74c6d83e42a2ec2030e629933745fa9ddef5`: this task file.
  - `a1a8c93ee285f7f7052074e8231b893abf2609ef`: server v0.1.83 into `backend/`, with history.
  - `6f2c1884b40a4cbe8629ff95747fada3d0065dde`: web interface v1.2.62 into `frontend/`, with
    history.
  - `e5ab9627b29cdfbbb16fef4cfea4a25627ef50b4`: record of the build permission block.
  - `ea4fdf66e7e7f070a5eb39ee0ad044b8f0ec8e18`: test fix (below).
  - Then this closing commit.
- **Imports:** both trees match the pinned tags exactly (`backend` 23a8265, `frontend`
  4fa5f22). Upstream lock and licence files unchanged.
- **Permission:** the first build attempt was refused by the supervisor's permission check
  ("Code from External"); the owner then approved building and testing in this worktree.
- **Server (`backend/`):** `go mod download` and `go build ./...` succeed.
  - `go test ./...` first run: 66 FAIL lines, all on Windows only: tests left their SQLite file
    open, so `t.TempDir()` cleanup could not delete it; 0 assertion failures, 0 panics.
  - Fix `ea4fdf6`: close the `sql.DB` in a `t.Cleanup` registered after `t.TempDir()` at 12
    test setup sites, as upstream's `internal/chore/api_permissions_test.go` already does. Test
    files only, 50 lines.
  - After the fix: 23 packages pass, 49 have no tests, 0 failures.
  - `go vet ./internal/... ./config/`: one upstream finding, left as is
    (`internal/realtime/pool.go:218`, return copies a lock value). Upstream CI doesn't run vet.
- **Web interface (`frontend/`):**
  - `npm ci`: 1323 packages, lock file unchanged. npm 11 skipped the 6 install scripts
    (`@posthog/cli`, `@swc/core`, `core-js`, `esbuild`, `sharp`, `yarn`); the build works
    without them.
  - `npm run build`: succeeds (Vite, 3 min 39 s, PWA with 58 precache entries).
  - `npm run lint`: 0 errors, 1981 warnings; Prettier clean; i18n audit "all keys resolve".
  - `node --test "tests/*.test.mjs"` (Node 24 needs the glob): 3 tests, 2 pass, 1 fails.
    `tests/task-editor-compatibility.test.mjs` can't find its target: SWC 1.13.5 returns only
    3 of the 7 `<Checkbox>` elements in `ChoreEdit.jsx`. The file has LF endings and the parse
    is deterministic, so this is an upstream test problem, not Windows. Upstream CI runs only
    build and lint. Left as is.
- **Found for later tasks:** `@posthog/cli` (PostHog analytics tooling) and Plus/paywall gating
  (`backend/external/payment`, `PAYWALL_REASON`) conflict with the "no cloud services, no
  analytics" limit; tasks 004 and 006.
- **Owner must:** review and merge the pull request (tasks 002 and 003, plus the folder-name fix
  `b36c5c2`).
