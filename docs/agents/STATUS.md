# Status: the record

Update this file at every stop. Output from the real machines beats anything written here.

## Production (none yet)

- Target: the owner's home server, home network only. Nothing deployed. Deployment model not
  yet in the protected projects file; isolated behavior applies until it is.
- Commit running: none.

## GitHub

- Repository `abadran101/wuzzanext`. Default branch `main` at 128c3ff. Open branches:
  `task/001-setup-check` (pull request for task 001).
- Remote `origin` is `https://github.com/abadran101/wuzzanext.git`, confirmed with
  `git ls-remote origin` on 2026-10-26.
- Agents push task branches with the fine-grained token the orchestrator lists (it covers only the
  owner's agent repositories). The owner merges into the default branch.

## Development (dev machine)

- Account `devagent`, work folder `C:\dev`, main clone at `C:\dev\wuzzanext`, Tokenmaxximus
  environment "wuzzanext dev". Worktrees: `C:\dev\wt\wuzzanext-NNN-short-name`.
- The orchestrator (`C:\dev\orchestrator`) holds the shared policy, add-ons and the tool versions.
- Tools: Claude Code 2.1.301, Codex CLI 0.163.0, Git 2.56.0. **Missing:** Go, Node.js, JDK,
  Android SDK (task 002).
- Coding provider: codex. Codex profile: none set.
- Locked rules: `git push --dry-run origin main` refused without a prompt on 2026-10-26, again
  from `C:\dev\wuzzanext` the same day.
- Codex hand-off: read-only run from `C:\dev\wuzzanext` on 2026-10-26, 9 s, no prompts, answer
  checked against the repository.
- Fence last tested with Tokenmaxximus' security check: not run in this session.

## In flight

- 001 setup check and plan: done, pull request open for the owner to merge.

## Open items

1. Owner installs the build tools (task 002).
2. Owner answers the open questions from the 001 report: build tools, offline conflict rule,
   reminders, logo cut-out, sample recipe pages, HTTPS/Docker on the home server, repository
   public. The orchestrator takes them to the owner one at a time.
3. `CLAUDE.md` and `AGENTS.md` still name the old folder `wuzzanikist-website` (title, work
   folder, worktree paths). The supervisor uses `C:\dev\wuzzanext` and
   `C:\dev\wt\wuzzanext-NNN-short-name`; the owner updates those files or says to.

## Decisions (newest first)

- 2026-10-26: task 001 may be closed and its pull request opened (owner, through the
  orchestrator).
- 2026-10-26: the project was re-added as Wuzzanext: folder `C:\dev\wuzzanext`, environment
  "wuzzanext dev" (owner, through the orchestrator).
- 2026-10-26: the brief in `docs/BRIEF.md` is to be implemented (owner, through the
  orchestrator).
- 2026-10-26: the repository is renamed to `abadran101/wuzzanext` (no `-website`) (owner,
  through the orchestrator).
- 2026-10-26: the name is Wuzzanext (owner, through the orchestrator).
