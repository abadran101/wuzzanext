# Status: the record

Update this file at every stop. Output from the real machines beats anything written here.

## Production (none yet)

- Target: the owner's home server, home network only. Nothing deployed. Deployment model not
  yet in the protected projects file; isolated behavior applies until it is.
- Commit running: none.

## GitHub

- Default branch `main` at 4950000. Open branches: `task/001-setup-check` (local).
  A stale local branch `feature/donetick-base` holds only the README commit (d856b41); nothing
  to keep, the owner may delete it on GitHub if it was pushed.
- Agents push task branches with the fine-grained token the orchestrator lists (it covers only the
  owner's agent repositories). The owner merges into the default branch.
- The owner will rename the GitHub repository to `abadran101/wuzzanext`. When the orchestrator
  says it is done: `git remote set-url origin https://github.com/abadran101/wuzzanext.git`, then
  confirm with `git ls-remote origin`. The local folder and the Tokenmaxximus project name stay
  `wuzzanikist-website`.

## Development (dev machine)

- Account `devagent`, work folder `C:\dev`, main clone at `C:\dev\wuzzanikist-website`.
- The orchestrator (`C:\dev\orchestrator`) holds the shared policy, add-ons and the tool versions.
- Tools: Claude Code 2.1.301, Codex CLI 0.163.0, Git 2.56.0. **Missing:** Go, Node.js, JDK,
  Android SDK (task 002).
- Coding provider: codex. Codex profile: none set.
- Locked rules: `git push --dry-run origin main` refused without a prompt on 2026-10-26.
- Fence last tested with Tokenmaxximus' security check: not run in this session.

## In flight

- 001 setup check and plan: report sent to the orchestrator, waiting on the owner's OK and
  answers.

## Open items

1. Owner installs the build tools (task 002).
2. Owner answers the open questions in the 001 report (conflict rule, logo cut-out, server TLS,
   sample recipe pages, repository public).

## Decisions (newest first)

- 2026-10-26: the repository is renamed to `wuzzanext` (no `-website`); the local folder and
  project name stay (owner, through the orchestrator).
- 2026-10-26: the name is Wuzzanext (owner, through the orchestrator).
