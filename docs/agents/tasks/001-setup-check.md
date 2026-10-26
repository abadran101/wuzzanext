# Task 001: dev machine setup check

- **Status:** ready
- **Branch:** `task/001-setup-check` from `main`, in the main clone
- **Hand-off:** supervisor, plus one small read-only Codex run
- **Shares:** nothing

## Goal

Prove the dev machine can build and test the project and that a Codex hand-off works, and fill in
the record.

## What to do

0. **Tell the orchestrator you started.** Find its session with `ListAgents` (it is named
   `orchestrator`) and send one line: `Task 001 started in wuzzanikist-website.` If it is not running,
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
