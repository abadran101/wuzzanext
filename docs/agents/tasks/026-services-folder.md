# Task 026: install folder under C:\services

- **Status:** done, branch pushed (PR to be opened by the owner)
- **Branch and worktree:** `task/026-services-folder` from `main` (a6efa64a), in
  `C:\dev\wt\wuzzanext-026-services-folder`
- **Hand-off:** supervisor (no Codex, STATUS Decisions 2026-10-29)
- **Shares:** the 019 deployment spec, owner guide and config template
- **Your time:** ~5 min (review, merge), then the 019 steps with the new package
- **Who:** Claude → You (merge) → Claude (package from the merged hash)
- **Waits on:** nothing

## Goal

The home server keeps its services under `C:\services\<service-name>`. Wuzzanext's install
moves from a `Wuzzanext` folder at the top of drive C: to `C:\services\wuzzanext` in every
file that names it, before the first deployment, so the owner and Tokenmaxximus install it
there from the start.

## Read first

- `docs/deployment-spec.md`, `docs/owner-guide.md`, `deploy/selfhosted.yaml`.

## Limits that apply

- Owner, through the orchestrator, 2026-10-30: "I like to have services installed in
  C:\services\[service-name]". The folders are `C:\services\wuzzanext\app` (program,
  `config\`, source archive), `...\data` (database, uploads, logs, downloads) and
  `...\incoming`. The permissions table stays the same; inheritance is turned off on
  `C:\services\wuzzanext`, not on `C:\services`. The service name stays `Wuzzanext`; only the
  folder name is lowercase.
- No hostnames, addresses or secret values in the repository. No code change.

## What to do

1. Replace the old top-level folder with `C:\services\wuzzanext` everywhere in the tree.
2. Say in the spec that inheritance is turned off on `C:\services\wuzzanext` only, and that
   `C:\services` is created if missing and otherwise left as it is.
3. Record PR #18 and PR #19 merged and PR #20 closed unmerged.

## Acceptance

- A case-insensitive `git grep` for the old path (drive C:, backslash, `Wuzzanext`) finds
  nothing.
- The template parses as YAML; the owner guide's PowerShell block parses; lint passes.

## Result (filled in before the push, in the task's own branch)

- Change: 88c99ba3dbb8b0f116ee584d4e130fbb7038cfe0. `deploy/selfhosted.yaml` (3 paths),
  `docs/deployment-spec.md` (29, plus the inheritance paragraph), `docs/owner-guide.md` (3,
  including the SHA-256 check block's `$base`); prose lines rewrapped. No code change, so the
  019 checks stand.
- Checked: the case-insensitive `git grep` for the old path finds nothing; the template
  parses as YAML (js-yaml) with the new `downloads_dir` and `base_path`; the owner guide's
  PowerShell block parses (0 errors).
- Records: PR #18 and PR #19 merged, PR #20 closed unmerged (STATUS).
- Left: the owner opens and merges the PR (the Tokenmaxximus PR call is refused in auto mode);
  then the supervisor rebuilds the package from the new merged hash and reports its
  SHA-256s. The a6efa64a package still names the old folder and should not be installed.
