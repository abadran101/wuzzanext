# Task 010: points and weekly leaderboard

- **Status:** done
- **Branch and worktree:** `task/010-weekly-points` from `main` (b3c1acf7), in
  `C:\dev\wt\wuzzanext-010-weekly-points`
- **Hand-off:** supervisor (Codex write runs stay paused, STATUS Decisions 2026-10-28)
- **Shares:** the points screen, the chore editor and quick-add (points default), Family
  settings
- **Your time:** ~10 min (Arabic wording check, merge)
- **Who:** Claude → You
- **Waits on:** nothing

## Goal

Finished chores earn stars, and a simple leaderboard shows this week's totals. A new chore is
worth 1 star without anyone touching settings. The leaderboard counts the household's
calendar week, Monday to Sunday, and starts from zero every Monday, so each week has a clear
winner.

Owner's decision (2026-10-29, through the orchestrator: "week starts Monday", no objection to
the rest): the calendar week Monday to Sunday, as one household setting with Monday as the
default; new chores worth 1 star unless their creator changes it; existing chores keep their
value. Supervisor's defaults, which stand: approved chores count in the week they are
approved; undoing takes the star back (as upstream); the 30-day, 6-month and all-time views
stay; the cleanup of charts and rewards is left to 011.

## Read first

- `docs/INVENTORY.md` (points rows), `frontend/src/views/User/UserPoints.jsx`,
  `backend/internal/chore/repo/repository.go` (`CompleteChore`, `ApproveChore`),
  `backend/internal/circle/menu_items.go` (the household-setting pattern from 024).

## Limits that apply

- No new dependency, no lock-file change. Made-up data only. Texts in English and Arabic,
  right to left.

## What to do

1. A household setting for the first day of the points week, Monday by default; admins
   change it, everyone reads it.
2. Save when a thumbs up approved a completion, so it counts in that week.
3. The points screen opens on this calendar week; only finished chores count.
4. New chores are worth 1 star in the chore editor and in quick-add.

## Acceptance

- `go build`, `go vet` (only pool.go:218), `go test ./...` pass; `npm run build`,
  `npm run lint` (0 errors), node tests (only the known upstream failure).
- In the browser, English and Arabic: the leaderboard shows this week from Monday; last
  Sunday's chore doesn't count until the week starts on Sunday; an approved chore counts in
  its approval week; a waiting one doesn't; a member sees the same board but not the
  setting; new chores from the editor and quick-add save with 1 star.

## Result (filled in before the push, in the task's own branch)

- Commit dee925cacb20d1b16c423477971461b7c0e2fad3:
  - Backend: `circles.week_start` (0 Sunday to 6 Saturday, default 1), with
    `GET`/`PUT /api/v1/circles/week-start`. Members read it; only an active admin, not acting
    as someone else, changes it (the 024 rule). `chore_histories.approved_at` is set by
    `ApproveChore`. Both columns are added by the existing auto-migration. Existing circles
    get Monday.
  - Frontend: `utils/WeeklyPoints.js` (1-star default, week start, which entries count);
    `queries/WeekStartQueries.js`. The points screen's first tab is "Week" / "الأسبوع". The
    leaderboard and its chart count finished chores in the household's week, using the
    approval time when there is one. The other tabs count finished chores only; before, they
    also counted skipped, waiting and rejected ones. "Points week starts on" is a day picker in
    Family settings (admins). New chores default to 1 star in the editor and quick-add; an
    edited chore keeps its saved value.
  - Arabic: "6 ميغا" (6 mega) on the 6-month tab corrected to "6 أشهر". README current state
    updated.
- Tests:
  - Go (`circle/week_start_test.go`): Monday by default; a non-member gets 403; a member's
    change gets 403; impersonation gets 403; invalid days give 400; an admin saves Sunday.
    `chore/approval_flow_test.go` checks that `approvedAt` is set on approval.
  - Node (`tests/weekly-points.test.mjs`, 5 tests): the defaults, week edges, statuses, and
    the approval week.
- Checks: `go build` ok; `go vet` only pool.go:218; `go test ./...` 27 packages ok.
  `npm run build` ok; `npm run lint` exit 0: 0 errors, 1897 warnings (unchanged), i18n audit
  ok. Node tests 44/45; the one failure is the known upstream `task-editor-compatibility`
  test.
- Browser checks: Playwright with Edge 155, local test app, made-up accounts (Alex admin;
  Sam, Kim and Riley members), English and Arabic, 14/14 pass.
  - Made-up week: Sam did a 3-star chore today and a 2-star chore last Sunday. Kim did a
    4-star chore last Sunday, approved today. Riley's 5-star chore is waiting.
  - Leaderboard from Monday: Kim 4, Sam 3, Alex 0, Riley 0, in that order. Right to left in
    Arabic.
  - Alex sets Sunday in Family settings: the picker showed Monday / الاثنين before, and then
    Sam has 5.
  - Sam sees the same board without the setting, and the API refuses their change with 403.
  - New chores from the editor and quick-add save with 1 star; an existing chore keeps 4.
  - The console errors are the same kinds as in 009: requests cut off by navigation, and
    requests made before sign-in.
- The test servers are stopped. The test database and config (git-ignored) stay in the
  worktree; the made-up accounts are in `C:\dev\scratch\test-app-010.txt`.
- Not changed: the chart's day names stay in English, like the other tabs (022: English date
  phrases). A chore created straight through the API without points still gets none.
- For the owner, Arabic wording check: "الأسبوع" (Week tab), "هذا الأسبوع" (This week), "يبدأ
  أسبوع النقاط يوم" (Points week starts on), "6 أشهر" (6M tab).
