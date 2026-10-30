# Task 019: home-server package and deployment spec

- **Status:** in progress
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

- (to fill in)
