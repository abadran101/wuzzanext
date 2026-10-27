# Status: the record

Update this file at every stop. Output from the real machines beats anything written here.

## Production (none yet)

- Target: the owner's home server, home network only. Nothing deployed. Deployment model not
  yet in the protected projects file; isolated behavior applies until it is.
- Commit running: none.

## GitHub

- Repository `abadran101/wuzzanext`, private (stays private, owner 2026-10-26). Default branch
  `main` at 71262c6 (PR #5, task 021, merged 2026-10-27; PR #4, task 004, merged 2026-10-27;
  PR #3, task 006, merged 2026-10-26; PR #2, tasks 002-003, and PR #1, task 001, before it).
- Open branch: `task/005-logo` (PR open, waiting on the owner).
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
  approval in the supervisor's window; given for the task 003 worktree, then for every task
  worktree, on 2026-10-26.
- Fence last tested with Tokenmaxximus' security check: not run in this session.

## In flight

- 005 logo: done, PR open for the owner (task file Result).
- Next: 007 onward; 012-015 stay parked.

## Open items

1. Sample recipe pages from the owner (tasks 012-015 wait for them). All other questions from
   the 001 report are answered (Decisions, 2026-10-26).
2. Resolved by task 021: the unused PostHog, RevenueCat and Stripe packages are removed.
3. Resolved by task 004 (merged): analytics and Plus/payment code removed.
4. Upstream findings left as they are: one `go vet` finding
   (`backend/internal/realtime/pool.go:218`, copies a lock), one failing upstream web test, 1906
   lint warnings (after 004).

## Decisions (newest first)

- 2026-10-27: "I accept your recommendations" (owner, through the orchestrator). 007: the
  faces screen shows to anyone who opens the app at home; admins create profiles and can
  reset any PIN, each person changes their own; admins sign in by PIN too, password kept as
  a backup; 5 wrong PINs make that profile wait 1 minute; an on/off setting per device sends
  a shared tablet back to the faces after 5 minutes unused. Language is remembered per
  person. 023: only chore names, chore details and recipe names are sent (never profile
  names), names inside chore text as they are; a daily quota in Google Cloud keeps usage in
  the free allowance, and the owner checks pricing before choosing the newer LLM model; the
  server connects out to the translation endpoint only.
- 2026-10-27: no child accounts; everyone is an adult, roles are admin and regular user, no
  restrictions for kids (owner, through the orchestrator; changes 007 question 5).
- 2026-10-27: family-typed text should be translated with Google Cloud Translation (free up
  to 500,000 characters a month; "the data shared is not sensitive") (owner, through the
  orchestrator). The owner then changed `CLAUDE.md` section 3 in the supervisor's window
  (same day): the home server may call Google Cloud Translation for chore names, chore details
  and recipe names between English and Arabic; the API key lives only in the home server's
  configuration. Planned as task 023; design questions sent to the owner.
- 2026-10-27: new requirement, very important: "the web and mobile apps need to have an easy
  toggle button that switches the language of the entire app's content to be displayed in
  arabic" (owner, through the orchestrator). Planned as task 022; every new screen from 007
  on ships English and Arabic texts and works right to left.
- 2026-10-27: continue with 007 (owner, through the orchestrator).
- 2026-10-27: PR #5 (task 021) merged; merge that main into the 005 branch before its PR,
  then carry on with the plan (owner, through the orchestrator).
- 2026-10-27: README and docs are kept current: brought up to date in the next commit, and
  updated with every commit that changes what they describe, so anyone can pick up the
  project (owner, through the orchestrator; a standing rule in `CLAUDE.md` needs the owner's
  words in the supervisor's window).
- 2026-10-27: dependency cleanup approved: remove the unused PostHog, Stripe and RevenueCat
  packages, lock files regenerated by the tooling, as its own task and PR (owner, through the
  orchestrator). Done in task 021.
- 2026-10-27: PR #4 (task 004) merged; continue with 005, then 007 onward (owner, through the
  orchestrator).

- 2026-10-26: task 020 approved: the build puts a `git archive` of the exact commit into the web
  files, served as `/wuzzanext-source.tar.gz` and linked from the About page; the repository
  stays private; 020 comes before the first release (019) (owner, through the orchestrator).

- 2026-10-26: 019: the home server runs Wuzzanext as a Windows service (Docker is available but
  not wanted), behind the existing Nginx Proxy Manager on HTTPS, home network only, nothing
  reachable from outside; local file storage, not S3; the owner deploys through Tokenmaxximus
  by the merged full hash. No server hostnames or addresses in the repository (owner, through
  the orchestrator).
- 2026-10-26: 018: the Android app shows due-task reminders as local notifications from its own
  copy of the data, no Google push service; browser users get no push reminders (owner,
  through the orchestrator).
- 2026-10-26: 017: the most recent change wins, per record, by the time the change was made on
  the phone. Completions, photos and votes are their own entries and never overwritten; a
  delete beats an older edit; no field-by-field merging (owner, through the orchestrator).
- 2026-10-26: 005: for the app icon, Android launcher icon and favicon, remove only the outer
  teal background and keep the rounded tile with the flames; for in-app graphics, cut out the
  character alone; both transparent PNGs from `assets/logo/logo-original.jpg` (owner, through
  the orchestrator).
- 2026-10-26: the repository `abadran101/wuzzanext` is private and stays private (owner,
  through the orchestrator). AGPL source offer: task 020.
- 2026-10-26: PR #3 (task 006) merged (owner, through the orchestrator).
- 2026-10-26: the owner approved building and testing the imported code in every task worktree
  (owner, in the supervisor's window).

- 2026-10-26: PR #2 merged; start 006, then 004 and onward; recipe tasks stay parked (owner,
  through the orchestrator).
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
