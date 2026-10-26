# Rules for coding agents (Codex reads this file; Claude Code imports it)

## Where and how agents work

- Production lives on its own machine (none yet). **Codex never contacts a production
  gateway** or runs commands against production, its scheduled tasks or services. A
  Supervisor-only Production (Limited) exception in `CLAUDE.md` grants Codex nothing.
- Development happens in `C:\dev` on the dev machine, as the standard account `devagent`.
  Each task has a branch `task/NNN-short-name` from the default branch (`main`)
  and its own worktree under
  `C:\dev\wt\wuzzanikist-website-NNN-short-name`.
- When the supervisor runs you in a task worktree: don't commit, stage, stash, switch branches
  or touch `.git`. Leave every change in the working tree for review.
- For Codex: no network access, AI calls, real keys or real data. Tests use made-up data only.
  Claude's Supervisor-only gateway exception is governed by `CLAUDE.md` and owner permission;
  it never permits a shell, another LAN target or copying production data/secrets here.
- Don't change dependency lock files, vendored code or the supervisor's files
  (`CLAUDE.md`, `docs/agents/`) unless the task file says so.
- Edit files with file-editing tools, never by piping document text through a shell.

## Project rules

- <Coding rules for this project: language version, test command, style, what not to touch.>
