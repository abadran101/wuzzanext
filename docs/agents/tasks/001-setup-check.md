# Task 001: dev machine setup check

- **Status:** done (owner's OK 2026-10-26, through the orchestrator)
- **Branch:** `task/001-setup-check` from `main`, in the main clone
- **Hand-off:** supervisor, plus one small read-only Codex run
- **Shares:** nothing

## Goal

Prove the dev machine can build and test the project and that a Codex hand-off works, and fill in
the record.

## What to do

0. **Tell the orchestrator you started.** Find its session with `ListAgents` (it is named
   `orchestrator`) and send one line: `Task 001 started in wuzzanext.` If it is not running,
   go on without it and send your report when it is. Don't wait for anyone: Tokenmaxximus has
   already recorded this project in the orchestrator's records.
1. **Prove the locked rules are active:** run `git push --dry-run origin main`
   once. Claude Code must refuse it outright, without asking the owner. Report the exact message.
2. **Fill in the blanks** the orchestrator's onboarding left in `CLAUDE.md` (section 3, the project's
   limits; section 5, the owner's preferred block format), `AGENTS.md` (project rules),
   `docs/agents/STATUS.md` and `docs/agents/PLAN.md`. Write nothing private. Don't ask the
   owner one question at a time. Fill each blank, in this order:
   - from this repository;
   - from what the owner already settled in the other projects (their `CLAUDE.md`, `AGENTS.md`
     and `docs/agents/` in `C:\dev`, read only), when the same question applies here;
   - otherwise with the safest default, marked "default, owner can change".

   Ask only what touches keys, production or real data, or has no safe default, and put those
   questions in the step 5 report as one list, sent to the orchestrator.
3. **Build the environment and run the full test suite** as the README says. Report the counts.
4. **Test the Codex hand-off:** read `codex exec --help`, then do one read-only run with a
   harmless question about the code. Report the time and any prompts, and check the answer
   against the code. Write the working command line into `CLAUDE.md` section 7.
5. **Stop and report.** After the owner's OK: close the record in this branch (CLAUDE.md section
   4, steps 6 and 7), and run `/ready-to-merge`.

## Acceptance

- The push to the default branch was refused without a prompt.
- The full test suite passes on the dev machine (or, for a new project, there is a first test
  that runs).
- `CLAUDE.md` section 7 holds a command that ran.

## Result

- **Locked rules:** `git push --dry-run origin main` was refused without a prompt, from the old
  folder and again from `C:\dev\wuzzanext` on 2026-10-26 ("Permission to use PowerShell with
  command git push --dry-run origin main has been denied.").
- **Blanks filled:** `CLAUDE.md` sections 3, 5 and 7 and the `AGENTS.md` project rules, defaults
  marked; the owner reviews them in this pull request. Brief in `docs/BRIEF.md` (hostnames
  replaced by role names), milestones M0-M6 and tasks 002-019 in `PLAN.md`, the owner's logo in
  `assets/logo/logo-original.jpg`.
- **Test suite:** not met yet. There is no code, so no first test; Go, Node.js, JDK and the
  Android SDK are missing on the dev machine (task 002). The first tests come with the Donetick
  import (task 003).
- **Codex hand-off:** codex-cli 0.163.0, read-only, 13 s from the old folder and 9 s from
  `C:\dev\wuzzanext`, no prompts, answers checked against the repository. Command in
  `CLAUDE.md` section 7.
- **New home:** branch merged with `main` 128c3ff (a merge, not a rebase); records moved to
  `C:\dev\wuzzanext`, environment "wuzzanext dev", repository `abadran101/wuzzanext`.
- **Commits:** `50a272ffac3f6b255407ffb737a3ea62cfa09bc2` (setup check, brief, draft plan,
  logo), `a86be5b405d3b49d5832a7ad8a53709ef64a4e50` (repository rename recorded),
  `e6c87e433f4130e68f539b8fe9ddeb14c3cdbf71` (merge of `main` 128c3ff),
  `4b80e29177baced45b24f8c3568b67d216b43baf` (records moved to the new home),
  `4d6a47b6c24c971f72eeef6370938f62fa444ce4` (closing record), then the owner's request on
  2026-10-26 to move `CLAUDE.md` and `AGENTS.md` to the new folder and worktree names.
- **Owner must:** review the filled-in defaults in `CLAUDE.md` and `AGENTS.md`, merge this pull
  request, install the build tools (task 002) and answer the seven questions.
- **Left open:** seven owner questions (STATUS open item 2).
