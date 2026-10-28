# Task 008: chore content (instructions, "done means", pictures)

- **Status:** delegated (plan run first)
- **Branch and worktree:** `task/008-chore-content` from `main` (f9a53295faf163c6f0114d9b36b3de92a6804f12),
  in `C:\dev\wt\wuzzanext-008-chore-content`
- **Hand-off:** Codex (default model and effort), a read-only plan run first; supervisor reviews
- **Shares:** the chore model, the chore editor and the chore page; 009 (photo proof) builds on it
- **Your time:** ~15 min (review in the test app, merge)
- **Who:** Claude → Codex → Claude → You
- **Waits on:** nothing (PR #12 merged)

## Goal

A chore says clearly what to do and what counts as done, with pictures. Whoever creates a chore
can write instructions (the existing details, with pictures) and a separate short "Done means"
text (also with pictures, for example a photo of a tidy room). Whoever does the chore sees both
on the chore page, and the "Done means" text again when they mark it done.

## Read first

- `docs/BRIEF.md` (Tasks), `docs/INVENTORY.md` rows "Instructions, pictures, done criteria" and
  the 008-009 notes.
- `backend/internal/chore/model/model.go` (`Chore`, `Description`), `backend/internal/chore/handler.go`
  (create and edit requests), `backend/internal/chore/repo/repository.go`,
  `backend/internal/database/migration.go`.
- `backend/internal/storage/` (uploads, `AddMediaRecord`, quota) and how chore pictures in the
  details are stored and signed (`frontend/src/utils/ImageCache.js`, `frontend/src/hooks/useDescriptionHtml.js`).
- Frontend: `frontend/src/views/ChoreEdit/ChoreEdit.jsx` and the task editor
  (`frontend/src/views/components/AddTaskModal.jsx`, `RichTextEditor.jsx`),
  `frontend/src/views/ChoreEdit/ChoreView.jsx` (details block), the completion flow (where a chore
  is marked done), the offline queue (`frontend/src/utils/CommandQueue.js`, `SyncEngine.js`), and the
  locale files in `frontend/public/locales/{en,ar}/`.

## Limits that apply

- `AGENTS.md`: no commits, no network, made-up data only (Alex, Sam); no lock-file or
  dependency changes.
- Reuse what exists (the rich-text editor, uploads, signed pictures); don't build a second upload
  path.
- The new text is not sent for translation in this task (task 023 covers names and details; the
  owner decides later whether "Done means" is translated too).
- Old chores without the new text look exactly as before. English and Arabic both, right to left
  included; every new text in both locale files (the parity test must pass).
- Keep it fun and simple: one extra field, an icon, little text.

## What to do

1. Backend: a new optional chore field for "Done means" (HTML, like the details), stored,
   returned with the chore, accepted on create and edit with the same size limits and checks as
   the details, kept by copy/duplicate where details are kept. Migration through the existing
   migration code.
2. Check that ordinary family members can add pictures to chore text (details and "Done means")
   on a self-hosted server: the Plus/quota checks the inventory mentions must not block them.
   Fix only what blocks a self-hosted family, and say what you found.
3. Frontend editor: a "Done means" field below the details, using the same rich-text editor
   with pictures.
4. Chore page: a "Done means" block (icon and title) under the details, with pictures rendered
   the same safe way as the details. When marking the chore done from the chore page, show the
   "Done means" text in the confirmation if the chore has one.
5. Offline: the new field goes through the same command queue and sync as the details.
6. Tests: Go tests for create, edit, read back, empty value, and the visibility rules; node test
   for any pure helper.

## Acceptance

- Backend: `go build ./...`, `go vet ./...` (only the known pool.go:218 finding), `go test ./...`
  all ok with the new tests.
- Frontend: `npm run build` ok; `npm run lint` exit 0, 0 errors, no more than 1897 warnings;
  `node --test "tests/*.test.mjs"`: new tests pass (one known upstream failure).
- By hand in the test app (Alex, Sam): a chore with details and "Done means", each with a
  picture, saves, shows on the chore page in English and Arabic, survives an edit; a chore
  without "Done means" looks as before.

## Result (filled in before the push, in the task's own branch)

- Commits (full hashes), tests, what was checked by hand, what is left, what the owner must do.
