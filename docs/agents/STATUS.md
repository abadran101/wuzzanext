# Status: the record

Update this file at every stop. Output from the real machines beats anything written here.

## Production (none yet)

- Target: the owner's home server, home network only. Nothing deployed. Deployment model not
  yet in the protected projects file; isolated behavior applies until it is.
- Commit running: none.

## GitHub

- Repository `abadran101/wuzzanext`, private (stays private, owner 2026-10-26). Default branch
  `main` at 6e0d7282 (PR #17, task 016, merged 2026-10-30; PR #16, task 010, merged 2026-10-29; PR #15, task 025, merged 2026-10-29; PR #14, task 009, merged 2026-10-29; PR #13, task 008, merged 2026-10-28; PR #12, task 023, merged 2026-10-28; PR #11, task 022, merged 2026-10-28; PR #10, task 024, merged 2026-10-27; PR #9, PR #8 and PR #7, task 007, merged 2026-10-27; PR #6, task 005, merged 2026-10-27; PR #5, task 021, and PR #4, task 004,
  merged 2026-10-27; PR #3, task 006, merged 2026-10-26; PR #2, tasks 002-003, and PR #1,
  task 001, before it).
- Open branches: `task/020-source-archive` (done, PR #18 open), `task/019-home-server` (done,
  PR open, on top of 020: merge #18 first).
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
- Coding provider: codex, but no Codex at all until the owner says so (Decisions 2026-10-29).
  Codex profile: none set. Codex hit its ChatGPT usage limit on
  2026-10-26 during task 003; the supervisor wrote the small fix itself.
- Locked rules: `git push --dry-run origin main` refused without a prompt on 2026-10-26, again
  from `C:\dev\wuzzanext` the same day.
- Running upstream code (builds and tests of `backend/` and `frontend/`) needs the owner's
  approval in the supervisor's window; given for the task 003 worktree, then for every task
  worktree, on 2026-10-26.
- Fence last tested with Tokenmaxximus' security check: not run in this session.

## In flight

- 020 source archive (task file): done, PR open. `node scripts/build-server.mjs` builds the
  Windows server with the web interface and a `git archive` of the exact commit inside it,
  served as `/wuzzanext-source.tar.gz` (the About page link). 019 packages that program.
- 016 Android APK: merged (PR #17). Unsigned APK 1.0.0 (code 100) in
  `C:\dev\scratch\wuzzanext-1.0.0-unsigned.apk`, SHA-256
  ca752bed110fe7057cced052980750ff7674d81083802b6085e9ed054ea2a4ae. The owner sets up signing
  (`docs/android-signing.md`), signs it and installs it on one phone; that install is the first
  test on a real phone.
- First deployment: keep `storage.base_path` (`./uploads`) on the data volume next to the
  database, or pictures are lost when the container is replaced (task 008 Result).
- Google key setup for 023 comes with the first deployment (`docs/translation-setup.md`).
- 019 home-server package (task file): done, PR open. Windows service mode, `wuzzanext.exe
  backup`, the APK download and running commit on the About page, the config template, the
  deployment spec for Tokenmaxximus and the owner guide. After the merge the supervisor
  builds the package from the merged hash; the owner deploys by the guide.
- Next: 020, then 019, 017, 018 (owner, 2026-10-30); 012-015 wait for the recipe samples.

## Open items

1. Sample recipe pages from the owner (tasks 012-015 wait for them). All other questions from
   the 001 report are answered (Decisions, 2026-10-26).
2. Resolved by task 021: the unused PostHog, RevenueCat and Stripe packages are removed.
3. Resolved by task 004 (merged): analytics and Plus/payment code removed.
4. Upstream findings left as they are: one `go vet` finding
   (`backend/internal/realtime/pool.go:218`, copies a lock), one failing upstream web test, 1897
   lint warnings (after 022).
5. For 017: a forced sign-out when a session expires still empties the offline queue (as
   upstream does), so changes made offline and not yet sent are lost. Needs one queue per
   person. Log out, Switch person and the tablet idle switch already wait for sync (007).
6. Suggestion for 011 (the supervisor's, not a decision): remove Report an Issue entirely. It can
   only send to an outside Discord or Slack webhook built into the app, none is set, and the
   no-cloud rule keeps it that way.
7. For 017 (found in 009, upstream): picture responses are cached for a week without
   `Vary: Origin`; across origins (the Android app) the offline picture cache's fetch reuses
   the `<img>` copy and is blocked by CORS. Fix with `Vary: Origin` on `/api/v1/assets`.

## Decisions (newest first)

- 2026-10-30: 019: Nginx Proxy Manager runs in Docker on the same Windows host ("same machine
  on docker"); the spec tests the bind address at deployment and lets only the Docker side
  reach port 2021. Service support built into `wuzzanext.exe` with x/sys/windows/svc, x/sys
  indirect to direct only ("agree with your recommendation"). Both through the orchestrator.

- 2026-10-30: PR #17 (task 016) merged; do 020 and 019 next, then 017 and 018, so the owner can
  test on a phone against the home server (owner, through the orchestrator: "merged, yes",
  answering "Should Wuzzanext do 020 and 019 next, so you can test on a phone against the home
  server? (recommended)"). 019 makes the package and a step-by-step guide; the owner deploys by
  the reviewed full merged hash, and neither agent touches the home server or the LAN.
- 2026-10-29: no Codex at all, read-only plan runs included, until the owner says otherwise; the
  supervisor does the remaining work (owner, through the orchestrator: "I want you to use Claude
  (Wuzzanext) to complete the remaining work, do not use Codex until I tell you").

- 2026-10-29: 016: the APK is signed on the owner's own Windows PC (owner, through the orchestrator:
  "yes my own pc"). The keystore and passwords stay there and in offline backups only; the
  supervisor hands over an unsigned APK and its SHA-256 (`docs/android-signing.md`).
- 2026-10-29: the owner installed Android SDK Platform 36, Build-Tools 36.0.0 and platform-tools
  on the dev machine and gave devagent read and execute on `C:\tools\Android` (owner, through the
  orchestrator: "Installed the three Android SDK packages and added devagent read/execute
  access.").
- 2026-10-29: 011 is not needed for now (owner, through the orchestrator: "im actually happy with
  how the app looks already"). The charts and rewards cleanup left for 011 is not happening
  either, unless the owner raises it. The 011 branch was stopped before any commit.
- 2026-10-29: PR #16 (task 010) merged, main 5231923e8acf3e469c5015fb5c28388dbc3e1afd, and the
  owner approved its Arabic wording (owner, through the orchestrator: "merged. arabic looks
  good"; checked: merge of e3060c81 and 8e8eb068).
- 2026-10-29: PR #15 (task 025) merged, main e3060c81be67342922e11c4dc33b4cbe0061b3b9 (owner,
  through the orchestrator: "15 merged"; checked: merge of b3c1acf7 and 3f597ad1). Merged into
  the 010 branch with a merge commit (the orchestrator's request). From now on every local test
  app sets `server.host` to 127.0.0.1 (the orchestrator's rule).
- 2026-10-29: task 010 (owner, through the orchestrator: "week starts Monday", no objection to
  the rest): the leaderboard is the calendar week, Monday to Sunday, starting from zero each
  Monday, as one household setting with Monday as the default; new chores are worth 1 star
  unless their creator changes it, and existing chores keep their value. The supervisor's
  defaults stand: approved chores count in the week they are approved, undoing takes the star
  back, the 30-day, 6-month and all-time views stay, and the cleanup is left to 011. Only
  finished chores count on the leaderboard (supervisor).
- 2026-10-29: PR #14 (task 009) merged, main b3c1acf7bd89d825c196dbd7870b382959828d37 (owner,
  through the orchestrator: "14 merged"; checked: merge of 84a3d570 and 513c93e2). Merged into
  the 025 branch with a merge commit (the orchestrator's request).
- 2026-10-28: an optional server listen-address setting, empty by default (listens on every
  interface as today); the local test config uses 127.0.0.1, the home server sets it in 019
  (owner, through the orchestrator: "i agree with your recommendation"). Task 025, its own
  branch and PR from main 84a3d570.
- 2026-10-28: task 009: each chore has the thumbs-up switch, on by itself when the chore is given
  to someone else, off for one's own chore, switchable; the done photo is optional; the creator
  approves and admins can too; a thumbs down sends the chore back to open with an optional note;
  points come on approval (owner, through the orchestrator: "agree").
- 2026-10-28: PR #13 (task 008) merged, main 84a3d5709f13ebc7fed5d32c5e0eddd299126d05 (owner,
  through the orchestrator: "merged"; checked: merge of f9a53295 and c8a04445). The test servers
  were stopped and their database, uploads and local config deleted.
- 2026-10-28: task 008 defaults (supervisor): "Done means" has no new size limit or sanitiser
  (the same as the details), keeps the storage quota, is not translated (the owner decides
  later), and is not in the quick-add dialog; clone sharing pictures and offline picture uploads
  stay as they are. Self-hosted storage defaults: local, 5 MB per file, 1 GB per person.
- 2026-10-28: the supervisor writes 008, and later tasks while Codex stays blocked (owner,
  through the orchestrator: "yes" to "Should Wuzzanext write 008 itself, and later tasks too while
  Codex stays blocked?"). A read-only Codex plan run is still fine; no Codex write runs, no
  workarounds, no setting changes, until the orchestrator says Codex is fixed.
- 2026-10-28: PR #12 (task 023) merged, main f9a53295faf163c6f0114d9b36b3de92a6804f12 (owner,
  through the orchestrator: "merged"; checked: merge of c0bd39bf and 4aadb5bf). Next 008 with
  Codex; if Codex is still blocked, stop and ask (the owner has not decided yet whether the
  supervisor writes 008).
- 2026-10-28: the supervisor writes 023 itself after Codex lost sandbox access to the worktree
  again at 09:46 (owner, through the orchestrator: "yes, continue with Wuzzanext writing it itself
  for now"). This covers 023 only; later tasks go back to Codex once its sandbox is fixed.
- 2026-10-28: PR #11 (task 022) merged, main c0bd39bf375450a0a969c5a5864f71382612a45b (owner,
  through the orchestrator: "merged"; checked on GitHub). Before the merge the owner reviewed the
  Arabic wording and the test app: "everything looks good" (owner, through the orchestrator); the
  supervisor's four choices stand: Western digits in Arabic dates, the browser format for English
  dates, the same swipe direction, English-only date phrases. Start 023 from that main.
- 2026-10-28: the supervisor writes the rest of 022 itself after Codex lost sandbox access again
  on 2026-10-27 at 21:22 (owner, through the orchestrator: "yes" to "Should Wuzzanext write the
  rest of 022 itself?"). No workaround for Codex was tried.
- 2026-10-27: PR #10 (task 024) merged, main 19e3923c76d9b1b9129e649d00ddd9242e11d107 (owner,
  through the orchestrator: "merged"; checked on GitHub). Before the merge, the owner's hand test
  of PR #10 passed: "they pass" (owner, through the orchestrator). Start 022 from that main.
- 2026-10-27: PR #9 (007 language switch and wordmark) merged; do 024 before 022 and 023
  (owner, through the orchestrator: "yes, and #9 is merged").
- 2026-10-27: menu items: "hide Archived, Things, Labels and Report an Issue from regular users,
  and let admins toggle menu items visible or hidden for other users"; "Those can be hidden for
  all non admin users (not user specific) and no need to block the actual pages"; PR #9 "Updates
  look good" (owner, through the orchestrator). Task 024.
- 2026-10-27: after testing 007, the owner asked for Switch language in the user menu and the
  Wuzzanext wordmark next to the logo ("Wuzza" and "next" in two colours); "Everything else
  looks good" (owner, through the orchestrator). Both done; 022 keeps the missing
  Arabic texts, full right-to-left check and the owner's wording review. PR #8 was merged
  before they were pushed, so they go in a new PR.
- 2026-10-27: PR #8 (007 Log out fix) merged (seen on GitHub: main f9d26b1e).
- 2026-10-27: PR #7 (task 007) merged (seen on GitHub: main e1b2bf31).
- 2026-10-27: 007's Log out waits for offline changes to sync, like Switch person; the
  forced sign-out on session expiry goes to 017 (owner, through the orchestrator: "yes").
- 2026-10-27: PR #6 (task 005) merged (owner, through the orchestrator: "#6 merged").
- 2026-10-27: Codex is back (owner, through the orchestrator: "codex is back"); its
  sandbox read and wrote the 007 worktree again.
- 2026-10-27: the owner reviews the Arabic wording when task 022 is done: "I can review it"
  (owner, through the orchestrator).
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
