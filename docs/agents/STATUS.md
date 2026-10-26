# Status: the record

Update this file at every stop. Output from the real machines beats anything written here.

## Production (none yet)

- Commit running: <full hash>, since <date>.
- Database or data version: <migration or schema version>.
- Services and scheduled jobs: <names and times>.

## GitHub

- Default branch `main` at <short hash>. Open branches and pull requests: <list>.
- Agents push task branches with the fine-grained token the orchestrator lists (it covers only the
  owner's agent repositories). The owner merges into the default
  branch.

## Development (dev machine)

- Account `devagent`, work folder `C:\dev`, main clone at `C:\dev\wuzzanikist-website`.
- The orchestrator (`C:\dev\orchestrator`) holds the shared policy, add-ons and the tool versions.
- Tools: Claude Code <version>, Codex CLI <version>, <runtime versions>.
- Fence last tested: <date>, with Tokenmaxximus' security check (all checks ok).

## In flight

- <task number and name: status>

## Open items

1. <item>

## Decisions (newest first)

- <date>: <decision and the one-line reason>
