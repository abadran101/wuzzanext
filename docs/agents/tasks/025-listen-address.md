# Task 025: optional server listen address

- **Status:** done
- **Branch and worktree:** `task/025-listen-address` from `main` (84a3d570), in
  `C:\dev\wt\wuzzanext-025-listen-address`
- **Hand-off:** supervisor (a three-line change; Codex write runs stay paused, STATUS
  Decisions 2026-10-28)
- **Shares:** nothing (the server's config and start-up only)
- **Your time:** ~5 min (review and merge)
- **Who:** Claude → You
- **Waits on:** nothing

## Goal

The server can be told which address to listen on. Empty, the default, listens on every
network interface as it does today; `127.0.0.1` keeps a local test app on the dev machine
only. The home server sets its own value in 019.

Owner's decision (2026-10-28, through the orchestrator: "i agree with your recommendation"):
default empty, meaning every interface as today; tests for both cases; the local test config
sets 127.0.0.1; its own branch and PR.

## Read first

- `backend/config/config.go` (`ServerConfig`), `backend/main.go` (`newServer`),
  `backend/config/selfhosted.yaml.example`.

## Limits that apply

- No new dependency, no lock-file change. Made-up data only. No hostnames or addresses of the
  home server in the repository.

## What to do

1. Add `server.host` to `ServerConfig`; empty by default.
2. Build the listen address from host and port (`net.JoinHostPort`, so IPv6 works too).
3. Add the line to the example config, with a comment.
4. Tests for empty and 127.0.0.1.

## Acceptance

- `go build ./...`, `go vet ./...` (only the known pool.go:218 finding), `go test ./...` pass.
- With `host: "127.0.0.1"`, `Get-NetTCPConnection -State Listen -LocalPort 2021` shows
  LocalAddress 127.0.0.1 only; with `host: ""` it shows `::` (every interface).

## Result (filled in before the push, in the task's own branch)

- Commit 512748b09c7698dcd9c5d149500f9e1699938237: `ServerConfig.Host` and `ListenAddr()`
  (`backend/config/config.go`), used by the server (`backend/main.go`); `host: ""` in
  `selfhosted.yaml.example`; the README's run steps mention it. `DT_SERVER_HOST` overrides it
  like any other key.
- Tests (`backend/config/listen_test.go`): empty host gives `:2021`; `127.0.0.1` gives
  `127.0.0.1:2021`; spaces are trimmed; `::1` gives `[::1]:2021`; the value is read from a
  config file (missing, empty, 127.0.0.1); a real listen on 127.0.0.1 is loopback only.
- `go build ./...` ok; `go vet ./...` only pool.go:218; `go test ./...` 27 packages ok.
- Live check on the dev machine (test config, made-up data, no accounts):
  - `host: "127.0.0.1"`: `127.0.0.1  2021 Listen`, and `/api/v1/ping` on 127.0.0.1 answered
    200.
  - `host: ""`: `::  2021 Listen` (every interface, as before).
  - Both servers stopped; the test database was deleted. The worktree's git-ignored
    `backend/config/selfhosted.yaml` stays on 127.0.0.1.
- Left: the home server's value is set in 019. The owner merges.
