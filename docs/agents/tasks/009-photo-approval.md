# Task 009: photo proof and thumbs-up approval by the assigner

- **Status:** done (PR open)
- **Branch and worktree:** `task/009-photo-approval` from `main` (84a3d5709f13ebc7fed5d32c5e0eddd299126d05),
  in `C:\dev\wt\wuzzanext-009-photo-approval`
- **Hand-off:** the supervisor writes the code (Codex write runs blocked; owner's decision of 2026-10-28)
- **Shares:** the chore page, the completion and approval handlers; builds on 006 and 008
- **Your time:** ~5 min (one decision, merge); the supervisor runs the browser checks
- **Who:** Claude → You
- **Waits on:** nothing (the owner answered on 2026-10-28)

## Goal

Whoever does a chore can add a "done" photo when marking it done, and whoever gave them the chore
sees it and approves with a thumbs up (or sends it back with a thumbs down). Today only admins can
approve, and the photo hides behind "Add a note".

## Read first

- `docs/BRIEF.md` (Tasks: photo proof), `docs/INVENTORY.md` rows "Completer attaches done photo",
  "Assigner approves with thumbs up" and the 008-009 notes.
- `backend/internal/chore/handler.go`: `CompleteChore`, `ApproveChore`, `RejectChore`,
  `pendingApprovalRecipients`; `backend/internal/chore/model/model.go` (`Chore`, `CreatedBy`,
  `RequireApproval`); `backend/internal/storage/handler.go` (`chore_completion_note` uploads).
- `frontend/src/views/ChoreEdit/ChoreView.jsx` (task actions, note editor, approve and reject),
  `frontend/src/views/Chores/ChoreCard.jsx` (`canApproveReject`), the chore editors' approval
  switch, and the locale files in `frontend/public/locales/{en,ar}/`.

## Limits that apply

- `AGENTS.md`: made-up data only (Alex, Sam); no lock-file or dependency changes.
- Reuse what exists: pending approval, approve and reject, completion notes with pictures, the
  existing upload path. No second upload path, no new history table.
- English and Arabic both, right to left included; the locale parity test must pass.
- Keep it simple: one photo button, thumbs up and down.

## What to do

1. Backend: the chore's creator (the assigner) may approve and reject, as well as admins and
   managers (one helper used by both handlers). Tell the creator about a pending completion
   even when they are not an admin.
2. Frontend: a "Done photo" button next to the note option on the chore page: it picks or takes a
   picture, uploads it as a completion-note picture and adds it to the note, which is sent with
   the completion as today.
3. The pending chore page shows the note and its photo to the approver above thumbs up and down
   (check what exists; fill only gaps).
4. When a chore asks for a thumbs up (owner's answer): the existing switch, turned on by
   itself in the editors while the chore is given to someone other than its creator and off
   for one's own chore, until the person flips it; an edit keeps the saved value.
5. Tests: Go tests for who may approve and reject, and who is told; node test for any pure helper.

## Acceptance

- Backend: `go build ./...`, `go vet ./...` (only the known pool.go:218 finding), `go test ./...`
  all ok with the new tests.
- Frontend: `npm run build` ok; `npm run lint` exit 0, 0 errors, no more than 1897 warnings;
  node tests pass (one known upstream failure).
- Browser checks (Playwright with Edge, English and Arabic): Sam completes Alex's chore with a done
  photo; it waits; Alex sees the photo and approves; points land. Thumbs down returns it to open.
  A member who did not create the chore can't approve it.

## Progress (supervisor)

- 2026-10-28: 008 merged (PR #13, main 84a3d5709f13ebc7fed5d32c5e0eddd299126d05; owner: "merged").
  009 is next; the supervisor writes it (owner's decision of 2026-10-28). Asked the owner (through
  the orchestrator) when a chore asks for a thumbs up; recommended: on by default when the chore
  is given to someone else, off for one's own chores, switchable.
- 2026-10-28: the owner's answer (through the orchestrator: "agree"): each chore has the
  thumbs-up switch, already on when the chore is given to someone else, off for one's own
  chore, switchable; the done photo is optional; the creator approves and admins can too; a
  thumbs down sends the chore back to open with an optional note; points come on approval.
- 2026-10-28: the owner approved an optional server listen-address setting (through the
  orchestrator: "i agree with your recommendation"); its own task and PR after the 009 PR.

## Result

- Commits: 69fe77decb7a66e7861ecdd21850e720c2abb23d (creator approves, done photo on the chore page),
  b7ad1ace2396cc6a4abf1ddf96ea8fa07f9aa483 (keep the thumbs-down note, reword the switch), then
  this record.
- Backend: `Chore.CanApprove` (the creator, or an active admin or manager, who can see the
  chore) guards approve and reject; push notices reach the creator too. A thumbs-down note is
  kept on the rejected completion, first, as "👎 <note>" above the doer's note and photo (upstream
  dropped it). No new table or column.
- Frontend: "Add a done photo" on the chore page uploads a completion-note picture into the
  note; the approver sees the whole note and photo above thumbs up and down; a thumbs down
  can carry a note. The switch ("Ask for a thumbs up") turns on by itself in the chore editor
  and the quick-add dialog while a new chore is given to someone else, off for one's own,
  until the person flips it; an edit keeps the saved value. New texts in English and Arabic.
- Checks (dev machine): `go build`, `go vet` (only pool.go:218), `go test ./...` 27 packages
  ok; `npm run build` ok; `npm run lint` exit 0, 0 errors, 1897 warnings, i18n audit ok; node
  tests 39 of 40 pass, the failure is the known upstream `task-editor-compatibility` test (fails
  on main 84a3d570 too).
- Browser checks (Playwright 1.59.1, Edge 155, local test app, made-up accounts Alex admin,
  Sam, Kim and Riley members), English and Arabic, 12/12 pass: direction; editor switch
  default; Sam completes Alex's chore with a done photo and it waits without points; Kim (not
  the creator) gets no thumbs buttons and 403 from the API; Alex sees the photo, approves, Sam
  gets 5 points; Sam (a member) gives Kim a chore, Riley can't decide (403), Sam's thumbs down
  with a note reopens it and Kim sees the note, then Sam's thumbs up gives Kim 3 points.
  Quick-add default: 2/2 pass. Console: no errors from 009 code (see the note below).
- Found, not fixed (upstream, for 017): picture responses are cached for a week without
  `Vary: Origin`, so when the web app and the server are on different origins (the dev
  servers, later the Android app) the offline picture cache's fetch reuses the `<img>` copy
  and the browser blocks it (CORS). Pictures still show; only their offline copy is missed.
- Left as is: the generated swagger files (`backend/docs`) still say admins approve; undoing a
  thumbs down keeps the 👎 note in the pending note.
- New Arabic texts for the owner's wording check: أضف صورة الإنجاز، أضف ملاحظة مع الرفض،
  انتهت، في انتظار الموافقة، تعذّر حفظ ردك، اطلب الموافقة، and the two switch descriptions.
- The owner: review and merge the PR.
