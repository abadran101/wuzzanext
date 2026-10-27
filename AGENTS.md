# Rules for coding agents (Codex reads this file; Claude Code imports it)

## Where and how agents work

- Production lives on its own machine (none yet). **Codex never contacts a production
  gateway** or runs commands against production, its scheduled tasks or services. A
  Supervisor-only Production (Limited) exception in `CLAUDE.md` grants Codex nothing.
- Development happens in `C:\dev` on the dev machine, as the standard account `devagent`.
  Each task has a branch `task/NNN-short-name` from the default branch (`main`)
  and its own worktree under
  `C:\dev\wt\wuzzanext-NNN-short-name`.
- When the supervisor runs you in a task worktree: don't commit, stage, stash, switch branches
  or touch `.git`. Leave every change in the working tree for review.
- For Codex: no network access, AI calls, real keys or real data. Tests use made-up data only.
  Claude's Supervisor-only gateway exception is governed by `CLAUDE.md` and owner permission;
  it never permits a shell, another LAN target or copying production data/secrets here.
- Don't change dependency lock files, vendored code or the supervisor's files
  (`CLAUDE.md`, `docs/agents/`) unless the task file says so.
- Edit files with file-editing tools, never by piping document text through a shell.

## Project rules

- The app is Wuzzanext, a fork of Donetick (AGPL-3.0): a Go backend and a React (Vite) web
  interface, wrapped as an Android app. Keep upstream license and copyright notices.
- Languages and test commands are pinned once the Donetick code is imported (task 003); until
  then: Go for the server (`go test ./...`), TypeScript/React for the interface (the repo's own
  `npm test`/lint scripts). (default, supervisor fills in after import)
- Keep the interface fun and simple: few options, little text, icons where they fit.
- Internal hostnames, family names and real recipes never go in code or tests; use configuration
  and made-up data.
- Don't touch: lock files, license files, the APK signing setup, unless the task file says so.
