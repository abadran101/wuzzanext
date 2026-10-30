# Task 019: home-server package and deployment spec

- **Status:** done, PR open (package from the merged hash still to build)
- **Branch and worktree:** `task/019-home-server` from `task/020-source-archive` (419f16e4,
  PR #18 not yet merged; main merged in once it is), in `C:\dev\wt\wuzzanext-019-home-server`
- **Hand-off:** supervisor (no Codex, STATUS Decisions 2026-10-29)
- **Shares:** `backend/main.go`, the server build script (020), the About page
- **Your time:** ~30 min once (copy, check, Nginx Proxy Manager entry, first sign-in), ~10 min
  per update, plus handing the spec to Tokenmaxximus
- **Who:** Claude → You (merge) → Tokenmaxximus on the host (install by the spec) → You
  (proxy entry, checks)
- **Waits on:** nothing (Nginx Proxy Manager answer below)

## Goal

The family's home server runs Wuzzanext as a Windows service behind Nginx Proxy Manager. The
owner gets a package (program, config template, owner guide, deployment spec) built from the
reviewed merged hash. Tokenmaxximus "Production deployments" carries out the spec on the
host with Windows consent. No agent touches the home server or the home network, and nothing
the supervisor writes runs as administrator.

## Read first

- `backend/main.go`, `backend/config/config.go` (`LoadConfig`, `DT_` environment variables),
  `backend/internal/database/database.go` (`DT_SQLITE_PATH`), `scripts/build-server.mjs`,
  `frontend/src/views/About.jsx`, `docs/translation-setup.md`, `docs/android-signing.md`.

## Limits that apply

- Owner, through the orchestrator, 2026-10-30 ("agree with your recommendation", option A):
  service support built into `wuzzanext.exe` with `golang.org/x/sys/windows/svc`; the only
  module change allowed is x/sys moving from indirect to direct in `go.mod` (`go.sum`
  unchanged, nothing downloaded). "If anything else in go.mod or go.sum would change, stop
  and tell me."
- Owner, through the orchestrator, 2026-10-30 ("same machine on docker"): Nginx Proxy Manager
  runs in Docker on the same Windows host. The spec names the bind address and a firewall
  rule that lets only the Docker side reach port 2021, and has them confirmed at deployment
  (the NPM container reaches the health endpoint; another LAN device cannot reach the port).
  No hostnames or addresses in the repository.
- No admin blocks. Host work goes into the spec; the owner's own steps are normal-user ones.
- No hostnames, addresses or secret values in the repository. Test apps on 127.0.0.1 only.

## What to do

1. Service mode: started by the Windows service manager, the program works from its own folder,
   logs to a file, and stops cleanly on Stop and Shutdown.
2. `wuzzanext.exe backup -to <folder> [-keep N]`: a consistent database copy (`VACUUM INTO`) and the
   uploads, in a dated folder; older copies beyond N days are removed.
3. The signed APK, when placed in the configured downloads folder, is served at
   `/download/wuzzanext.apk` and linked from the About page; the About page shows the running
   commit (the build stamps it).
4. Config template, deployment spec, owner guide.
5. The package from the merged hash, with SHA-256s.

## Acceptance

- Go build, vet, tests (new: backup, download); web build, lint, node tests.
- Service mode checked on the dev machine without installing a service (not possible without
  admin): the non-service path still runs; the service path is covered by code review and the
  host's first start.
- Backup of a test database restores and opens.

## Result (filled in before the push, in the task's own branch)

- Code and docs: 0d8e190806f290f82e4a1d602a0f7ad6cba64aa1.
  - Service mode (`backend/service_windows.go`, `service_other.go`): when Windows starts it,
    the program changes to its own folder, sends its output to `DT_LOG_FILE` (renamed to
    `.old` over 20 MB), and stops the server cleanly on Stop and Shutdown. Started by hand it
    runs as before. `go.mod`: only `golang.org/x/sys` moves from indirect to direct;
    `go.sum` unchanged, built with `GOPROXY=off`.
  - `wuzzanext.exe backup -to <folder> [-db] [-uploads] [-keep 14]`
    (`backend/internal/backup`): `VACUUM INTO` into a `.partial` folder, checked with
    `PRAGMA integrity_check`, uploads copied, renamed to `wuzzanext-YYYYMMDD-HHMMSS`; dated
    copies (and unfinished ones) older than N days are removed, other folders left alone.
    Exit 0 / 1 (failed) / 2 (usage).
  - `server.downloads_dir`: a placed `wuzzanext.apk` is served at `/download/wuzzanext.apk`
    (GET and HEAD, Android content type, attachment); nothing else in the folder is
    reachable. The About page links it only when it is there, and shows "Running version"
    with the first 12 characters of the commit, which `scripts/build-server.mjs` now stamps
    (`-X config.Commit`, `config.BuildDate` = the commit's time, so builds stay alike).
  - `deploy/selfhosted.yaml` (template, placeholders only), `docs/deployment-spec.md`
    (for Tokenmaxximus: folders and permissions, service and its own environment, bind
    address with two tested options and the matching firewall rule, nightly backup task,
    updates with a way back, checks), `docs/owner-guide.md` (normal-user steps: copy,
    SHA-256 check block, Tokenmaxximus, proxy entry, browser checks, APK).
    `docs/translation-setup.md` now points to the spec instead of admin steps. The build
    script packages the three files with `SHA256SUMS.txt`.
- Checked on the dev machine:
  - `go build ./...` (Windows and `GOOS=linux`), `go vet ./...` (only the known
    `realtime/pool.go:218` finding), `go test ./...` 29 packages ok (new: `internal/backup`
    4 tests, `frontend` download 3 tests); gofmt clean on the changed files.
  - `npm run lint` exit 0 (0 errors, 1897 known warnings, Prettier clean, i18n keys
    resolve); `node --test tests/*.test.mjs` 48/49 (the known `task-editor-compatibility`
    failure); the owner guide's PowerShell block parses (0 errors, ASCII only).
  - Package built from 0d8e1908 with a clean tree; run from a scratch folder on 127.0.0.1
    with made-up data and the filled template: `/health` shows the full commit, port 2021
    listens on 127.0.0.1 only, `/api/v1/health` 200, APK 404 before and 200 after placing a
    test file (content type and file name right), another file in the folder not served.
  - Backup while the server ran: `backup ok`, then a fresh server on the restored copy
    (old one stopped first, checked by process path): the made-up account signs in, a wrong
    password gets 401. About page in Edge against it: commit shown, app link absent without
    the APK and present with it, no page errors.
  - Service path not run (installing a service needs administrator): covered by review and
    the host's first start (spec, section 7).
- Left and for the owner:
  - Branch sits on `task/020-source-archive`: merge PR #18 first, then this one.
  - After the merge the supervisor builds the package from the merged hash and reports the
    hash and SHA-256s; the owner follows `docs/owner-guide.md` (Tokenmaxximus carries out
    `docs/deployment-spec.md` with Windows consent).
  - Which bind option works (spec, section 4) is found at deployment, not assumed.
