# Task 018: due-task reminders as local phone notifications

- **Status:** done, branch pushed (PR to be opened by the owner)
- **Branch and worktree:** `task/018-local-reminders` from `main` (b1de072f), in
  `C:\dev\wt\wuzzanext-018-local-reminders`
- **Hand-off:** supervisor (no Codex, STATUS Decisions 2026-10-29)
- **Shares:** the offline chore copy from 017 (reads it, doesn't change it)
- **Your time:** ~5 min (review, merge), then a try on the phone with the next install
- **Who:** Claude → You (merge, phone try)
- **Waits on:** nothing

## Goal

The Android app reminds the signed-in person of their own due chores with notifications it
schedules itself, from its own copy of the chores, with no push service. Reminders keep up with
changes made on any screen, offline included, read in the app's language (English or Arabic),
stop when the person signs out or switches device notifications off, and a new chore starts
with sensible reminders whether it is made with quick add or the full editor. The web app shows
no reminders.

## Read first

- `frontend/src/views/Chores/LocalNotificationScheduler.js` (upstream scheduler).
- `frontend/src/views/Settings/NotificationSetting.jsx` (the device switch).
- `frontend/src/hooks/useAppBadgeSync.js` (an app-wide hook on the same chore query).
- `frontend/src/queries/ChoreQueries.jsx` (`useChores`, backed by the 017 offline copy).

## What was there already

Upstream already scheduled local reminders from each chore's `notificationMetadata.templates`
(a signed value with `m`, `h` or `d`; negative is before due). But only the Tasks screen did
it, so a change made on Home or replayed after a sync left old reminders behind. The text was
English only. The permission check failed on an empty preferences entry and never asked
Android whether notifications were allowed. Switching device notifications off in Settings was
never stored, and sign-out left reminders pending. The full editor gave a new chore no
reminders, while quick add gave three.

## Limits that apply

- Owner, through the orchestrator, 2026-10-26: "the Android app shows due-task reminders as
  local notifications from its own copy of the data, no Google push service; browser users get
  no push reminders".
- No dependency or lock-file changes: `@capacitor/local-notifications` and the
  `POST_NOTIFICATIONS` permission were already in. No server change.
- Made-up data in tests; browser checks on 127.0.0.1 only.

## Defaults chosen (the supervisor's safe default, not an owner decision)

- Who is reminded: the signed-in person only, for chores assigned to them, chores listing them
  among the assignees, or chores open to anyone. Not for chores waiting for approval or paused.
- When: 1 day before, at the due time and 1 day after, as quick add already did; each chore
  can change or remove them in its editor. Only the next occurrence of a repeating chore is
  scheduled; reminders are refreshed whenever the app opens, syncs or a chore changes.
- At most 64 pending reminders (Android's limit), soonest first.
- A shared tablet on the faces screen has nobody signed in, so it shows no reminders.

## What to do

1. A pure planner (`frontend/src/utils/ReminderPlan.js`): who is reminded, when, the text, the
   64 cap, and the shared default reminders for new chores.
2. An app-wide hook (`useChoreReminders`) on the offline-backed chore query; the Tasks screen
   no longer schedules on its own.
3. Real permission check; one scheduling run at a time; cancel on sign-out and on switch-off;
   store the switch-off; reschedule at once when the switch changes.
4. Reminder texts in English and Arabic.
5. The full editor starts a new chore with the same reminders as quick add.
6. Tests for all of the above.

## Acceptance

- `node --test "tests/*.test.mjs"` in `frontend/`: the 10 new reminder tests pass; only the
  known upstream `task-editor-compatibility` failure remains.
- `npm run lint`: 0 errors, 1897 warnings (unchanged). `npm run build` succeeds.
- Go unchanged: `go build`, `go vet` (only the known `pool.go:218`), `go test` (29 packages).
- Browser on 127.0.0.1, English and Arabic: a task made in the full editor is saved with
  reminders on, 1 day before / at due / 1 day after; no new page errors.

## Result (filled in before the push, in the task's own branch)

- Commits: 3d6ec6b71c4e44f3a3463677f2ef1de3af36bf7e (reminders), then this record commit.
- Tests: `node --test` 66 tests, 65 pass, the one failure is the known upstream
  `task-editor-compatibility` test (also failing on main). The 10 new tests in
  `tests/reminders.test.mjs` cover the planner (timing, past reminders skipped, who is reminded,
  off/no due date/paused/awaiting approval, older template shapes, de-duplication, soonest
  first and the 64 cap), the texts with a stand-in translator, the default reminders with a
  fake storage (an empty choice is kept), the wiring (App mounts the hook, the Tasks screen no
  longer schedules, sign-out cancels, switch-off is stored) and both languages' texts.
- `npm run lint`: 0 errors, 1897 warnings. `npm run build`: ok. Go: build ok, vet only
  `pool.go:218`, 29 packages ok.
- Browser check on 127.0.0.1 with a made-up household (server built from 3d6ec6b7 by
  `scripts/build-server.mjs`): Kim signs in with her PIN, makes a task in the full editor, and
  it is saved with `notification: true` and templates -1d, 0m, +1d, in English and in Arabic;
  no page errors apart from the known view-transition notices. 10 of 10.
- Not checked: the notifications themselves. They only exist in the Android app, so no browser
  can show them, and no phone is set up yet. No APK was built for this task.
- Left for the owner: merge, then with the next APK install allow notifications when the app
  asks, make a chore due in a few minutes with an "at due" reminder, and see it arrive with the
  app closed and the phone offline.
