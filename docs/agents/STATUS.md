# Status: the record

Update this file at every stop. Output from the real machines beats anything written here.

## Production (none yet)

- Target: the owner's home server, home network only. Nothing deployed. Deployment model not
  yet in the protected projects file; isolated behavior applies until it is.
- Commit running: none.

## GitHub

- Repository `abadran101/wuzzanext`. Default branch `main` at 1224ad8 (PR #1, task 001,
  merged 2026-10-26).
- Open branch: `task/003-donetick-import` (tasks 002 and 003, one pull request). It also carries
  `8023fbc` (the `CLAUDE.md`/`AGENTS.md` folder names), which was pushed to the task 001 branch
  after PR #1 merged and so is not in `main`; it is cherry-picked here as `b36c5c2`.
- Remote `origin` is `https://github.com/abadran101/wuzzanext.git`, confirmed with
  `git ls-remote origin` on 2026-10-26.
- Agents push task branches with the fine-grained token the orchestrator lists (it covers only the
  owner's agent repositories). The owner merges into the default branch.

## Code

- `backend/`: Donetick server v0.1.83, Go module `donetick.com/core` (go 1.24). Test:
  `go test ./...` in `backend/` (23 packages pass on the dev machine).
- `frontend/`: Donetick web interface v1.2.62 (React, Vite, Capacitor Android app in
  `frontend/android`). Checks: `npm ci`, `npm run build`, `npm run lint` in `frontend/`.
  `node --test "tests/*.test.mjs"` has one failing upstream test (task 003 Result).
- Both imported with `git subtree` (history kept); later upstream releases come in with
  `git subtree pull --prefix=<folder> <url> <tag>`.

## Development (dev machine)

- Account `devagent`, work folder `C:\dev`, main clone at `C:\dev\wuzzanext`, Tokenmaxximus
  environment "wuzzanext dev". Worktrees: `C:\dev\wt\wuzzanext-NNN-short-name`.
- The orchestrator (`C:\dev\orchestrator`) holds the shared policy, add-ons and the tool versions.
- Tools: Claude Code 2.1.301, Codex CLI 0.163.0, Git 2.56.0, Go 1.27.3, Node.js 24.22.1 with
  npm 11.19.1, Temurin JDK 21.0.12.1 (`JAVA_HOME`, machine), Android command-line tools 22.0
  (`ANDROID_HOME` = `C:\tools\Android`, machine). Temurin 25 also installed, not first on PATH.
- Coding provider: codex. Codex profile: none set. Codex hit its ChatGPT usage limit on
  2026-10-26 during task 003; the supervisor wrote the small fix itself.
- Locked rules: `git push --dry-run origin main` refused without a prompt on 2026-10-26, again
  from `C:\dev\wuzzanext` the same day.
- Running upstream code (builds and tests of `backend/` and `frontend/`) needs the owner's
  approval in the supervisor's window; given for the task 003 worktree on 2026-10-26.
- Fence last tested with Tokenmaxximus' security check: not run in this session.

## In flight

- 002 build tools and 003 Donetick import: done, one pull request for the owner to merge.

## Open items

1. Owner answers the open questions from the 001 report: offline conflict rule, reminders, logo
   cut-out, sample recipe pages, HTTPS/Docker on the home server, repository public. The
   orchestrator takes them to the owner one at a time. Recipe tasks 012-015 wait for the samples.
2. Upstream brings `@posthog/cli` (PostHog analytics tooling) and Plus/paywall gating
   (`backend/external/payment`, `PAYWALL_REASON` in the web interface). Both conflict with the
   "no cloud services, no analytics" limit; tasks 004 and 006 handle them.
3. Upstream findings left as they are: one `go vet` finding
   (`backend/internal/realtime/pool.go:218`, copies a lock), one failing upstream web test, 1981
   lint warnings.

## Decisions (newest first)

- 2026-10-26: the owner approved building and testing the imported Donetick code in the task
  003 worktree (owner, in the supervisor's window).
- 2026-10-26: start building now; recipe samples come later, so 012-015 wait (owner, through the
  orchestrator).
- 2026-10-26: the plan (tasks 002-019 as drafted) is approved; start 002, then 003 (owner,
  through the orchestrator).
- 2026-10-26: `CLAUDE.md` and `AGENTS.md` use `C:\dev\wuzzanext` and
  `C:\dev\wt\wuzzanext-NNN-short-name` (owner, in the supervisor's window).
- 2026-10-26: task 001 may be closed and its pull request opened (owner, through the
  orchestrator).
- 2026-10-26: the project was re-added as Wuzzanext: folder `C:\dev\wuzzanext`, environment
  "wuzzanext dev" (owner, through the orchestrator).
- 2026-10-26: the brief in `docs/BRIEF.md` is to be implemented (owner, through the
  orchestrator).
- 2026-10-26: the repository is renamed to `abadran101/wuzzanext` (no `-website`) (owner,
  through the orchestrator).
- 2026-10-26: the name is Wuzzanext (owner, through the orchestrator).
