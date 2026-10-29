# Task 008: chore content (instructions, "done means", pictures)

- **Status:** done (PR open)
- **Branch and worktree:** `task/008-chore-content` from `main` (f9a53295faf163c6f0114d9b36b3de92a6804f12),
  in `C:\dev\wt\wuzzanext-008-chore-content`
- **Hand-off:** a read-only Codex plan run; the supervisor writes the code (Codex write runs blocked)
- **Shares:** the chore model, the chore editor and the chore page; 009 (photo proof) builds on it
- **Your time:** ~15 min (review in the test app, merge)
- **Who:** Claude → Codex (plan) → Claude → You
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

## Progress (supervisor)

- 2026-10-28: the supervisor writes 008, and later tasks while Codex stays blocked (owner,
  through the orchestrator: "yes" to "Should Wuzzanext write 008 itself, and later tasks too while
  Codex stays blocked?"). A read-only Codex plan run is still fine; no Codex write runs, no
  workarounds, no setting changes, until the orchestrator says Codex is fixed.

## Result (filled in before the push, in the task's own branch)

- **Commits:** 7b7862ef008d793d08b0135bc0942c8297e84802 (task file, plan; PR #12's merge),
  55297586456103d828c0994fdc25a6aa3691560d (code),
  a225c9f276e12ed2aff384eacab15f58da729a29 (a test), d8edc90ec62da8ce22b4d3971cc356201ae20c9e
  (record), 539385258bca84903931ae380c6b1f420a330217 (saved pictures load; found by the browser
  checks), then this record.
- **Codex:** one read-only plan run (exit 0); the supervisor wrote the code (owner's decision).
- **Backend:** `Chore.DoneMeans` (`chores.done_means`, text, added by the existing auto-migration),
  returned by the chore and chore-detail reads with pictures signed like the details, accepted on
  create and edit. An edit without `doneMeans` (older app, queued offline edit) keeps the saved
  text; `""` clears it. Picture clean-up looks at both texts (`choreText`), so a picture in
  either stays. The lite API's update keeps the field (it updates by field map).
- **Pictures for a self-hosted family (what was found):** Plus membership blocks nothing
  (`User.IsPlusMember` is always true). Two real blocks, both fixed: (1) the self-hosted config
  template (`backend/config/selfhosted.yaml.example`, written on first start) had no `storage`
  section, so the server fell back to cloud storage with a 0-byte file limit and refused every
  upload (413); it now sets local storage in `./uploads`, 5 MB per file, 1 GB per person.
  (2) PIN profiles get no storage-usage row, so `AddMediaRecord` refused their uploads (507);
  the first upload now starts the row. A member still can't add pictures to a chore they may not
  edit (existing edit rule, unchanged).
- **Frontend:** a "Done means" editor (icon, title, same rich-text editor and upload path) under
  the details in the full chore editor; a "Done means" block on the chore page; the complete
  button shows it in an "Is it done?" confirmation (`ConfirmationModal` takes rich `content`).
  Offline: the command queue and offline chores carry the field as is; the offline image cache
  collects its pictures. Texts in English and Arabic. Helper `hasChoreContent` (empty editor =
  no text).
- **Choices (safe defaults):** no new size limit or sanitiser, the same as the details (the
  details are rendered the same way today); not translated; not in the quick-add dialog (kept
  simple, add it in the full editor); clone shares picture paths and offline picture uploads
  stay as they were before.
- **Checks:** `go build ./...` ok; `go vet ./...` only the known pool.go:218 finding;
  `go test ./...` 27 packages ok, new: `internal/chore/content_test.go` (create, edit, omitted
  field kept, empty clears, detail read, not readable from another circle, pictures in both texts) and
  `internal/storage/repo/repository_test.go` (profile's first upload, circle quota kept).
  `npm run build` ok; `npm run lint` exit 0, 0 errors, 1897 warnings; node tests 35 pass, 1 known
  upstream failure (new: `tests/chore-content.test.mjs`).
- **By hand (local test app, Alex and Sam, API level):** create with Arabic "Done means" reads
  back intact; Alex's picture uploads, is signed on read, survives an edit and an edit without
  the field; a chore without it has no field; Sam (PIN profile) uploads a draft picture and a
  picture to Sam's own chore and saves it in "Done means"; Sam is refused on Alex's chore (403,
  edit rule).
- **Browser checks (owner, through the orchestrator, 2026-10-28: "I want Wuzzanext to review the
  rest"):** Playwright 1.59.1 (`npm ci` in `frontend/e2e`, browser download skipped) driving the
  installed Edge 155 headless, against the local test app; scripts kept in scratch, not in the
  repo. English and Arabic (RTL): editor with pictures in details and "Done means" (admin),
  chore page block, edit and save keeps text and pictures, "Is it done?" (Not yet, then Yes),
  a chore without it completes directly, Sam (PIN profile) adds a picture: 14 of 14 pass.
  First run: saved pictures did not load (the local signer returns relative URLs and the editor
  kept them as is), so steps 2, 3, 5 and 6 failed in both languages; fixed in `ImageCache.js`
  (resolve against the API, as for fresh uploads), then all pass. Console errors left, all
  upstream and not from 008: the offline image cache's fetch is blocked by CORS (the image was
  cached first without an Origin header; display unaffected), a `quilljs-markdown` null error
  when the editor patches picture addresses (also with a details-only picture), aborted requests
  on navigation, an Emotion `:nth-child` warning. Server log: no panics; "Authentication
  failed" lines from signed-out pages only.
- **Left for the owner:** merge. First deployment: keep `./uploads` on the data volume (or set
  `DT_STORAGE_BASE_PATH`). Local test uploads land in `backend/uploads/` (untracked, not
  ignored: don't commit it).
