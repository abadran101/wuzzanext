# Task 017: offline copy and outbox sync

- **Status:** done, branch pushed (PR to be opened by the owner)
- **Branch and worktree:** `task/017-offline-sync` from `main` (e7f4d6b1), in
  `C:\dev\wt\wuzzanext-017-offline-sync`
- **Hand-off:** supervisor (no Codex, STATUS Decisions 2026-10-29)
- **Shares:** the chore handlers and sync endpoint (backend), the offline store, outbox and
  sync engine (frontend), sign-in and sign-out (007)
- **Your time:** ~5 min for the question, ~20 min to try it on a phone after the merge
- **Who:** Claude → You (answer, merge, phone test)
- **Waits on:** nothing

## Goal

Family members keep using the app with no connection: the chore list and chore pages stay
readable, and what they do is kept on the phone and sent when the connection is back. When
two people changed the same chore, the change made last (by the phone's clock) wins, as the
owner decided; completions, photos and thumbs-up are never lost. A forced sign-out, when a
session runs out, no longer throws away changes that were not yet sent.

## Read first

- Frontend: `src/utils/OfflineDB.js` (SQLite on Android, IndexedDB on the web),
  `src/utils/CommandQueue.js`, `src/utils/SyncEngine.js`, `src/hooks/useSyncOnReconnect.js`,
  `src/utils/ApiClient.js` (forced sign-out), `src/hooks/useAuth.jsx` (sign-in clears the
  store), `src/components/ProfileSessionManager.jsx` (switch person waits for the outbox),
  `src/utils/ImageCache.js`.
- Backend: `internal/chore/handler.go` (`validateActionVersion`, `ChoreReq.UpdatedAt`),
  `internal/chore/model/model.go` (`CanEdit`, `CanDelegate`), the `/sync/changes` endpoint.
- STATUS Decisions 2026-10-26 (the conflict rule) and 2026-10-27 (forced sign-out goes to 017);
  STATUS open items 5 and 7.

## What is there already (upstream)

- An offline copy of chores and history, a delta sync (`/sync/changes`, by sync version) and
  an outbox of commands replayed in order, with temporary ids remapped after a create.
- Conflicts: an edit carries the `updatedAt` the phone last saw and is refused when the chore
  changed since; actions carry a sync version and get 409 on a mismatch. The outbox parks
  such a command as "failed: modified by another user", so the older-or-newer question is
  never asked.
- One outbox for the device. Switch person and Log out wait until it is sent (007). A forced
  sign-out on an expired session (`ApiClient`) and every sign-in (`useAuth`) clear it.

## Limits that apply

- The conflict rule (owner, 2026-10-26): the most recent change wins, per record, by the time
  the change was made on the phone. Completions, photos and votes are their own entries and
  never overwritten; a delete beats an older edit; no field-by-field merging.
- No new dependencies; no change to `go.sum` or `package-lock.json`.
- A person's queued change is only ever sent with that person's own sign-in.
- Test data is made up; tests never use the network beyond 127.0.0.1.

## What to do

1. Server: chore edits, deletes and actions take the phone's change time. A change older
   than the chore's last change loses (answered as "superseded", not an error); a newer one
   wins. A delete wins over any older edit. Completions, photos and thumbs-up are always
   kept. Times more than 30 seconds in the future are refused, as upstream does.
2. Outbox: every command carries the time it was made; replay sends it; a "superseded" answer
   drops the command and shows a short note once, naming the chore ("1 change was replaced by
   a newer one"); nothing is left waiting (owner, 2026-10-30, through the orchestrator: "agree
   with recommended", option A). Completions, photos and thumbs-up are never dropped.
3. One outbox per person: commands are tagged with the person who made them. A forced
   sign-out keeps them; sign-in clears only the server copy, not other people's commands;
   replay sends only the signed-in person's commands. Switch person and Log out keep waiting
   for the current person's commands (007).
4. Pictures: `Vary: Origin` on `/api/v1/assets`, so the offline picture cache works in the
   Android app (STATUS open item 7).
5. README and STATUS: what works offline and what does not.

## Acceptance

- Go: build, vet (only the known finding), tests, with new tests for the change-time rule
  (older loses, newer wins, delete beats an older edit, completions kept, future refused).
- Web: build, lint, node tests (only the known failure), with new tests for per-person
  outboxes and the superseded answer.
- By hand on 127.0.0.1 with two made-up people in two browsers: one edits offline, the other
  edits online later; reconnect; the later edit stays. Expired session with a queued change:
  the change is still there after signing in again and is sent.

## Result (filled in before the push, in the task's own branch)

- Commits: 567c08f1b63c81755835cd79174ea99400154521 (task file),
  034f7b75a2b54aae721ae0dc690bd3c5f2afd84b (record), 430d1b950987a73150dcb399ed63e072075b53de
  (`Vary: Origin` on pictures; the owner's answer), aea31e71aa98a9c7fe80fecfd7f7c6bcf818e5fb
  (server: change time), 98688da99abb5e76b587861bc6a35883230fe69f (outbox per person, change
  time on replay, the note), 63bd3c3f94c4a8911370a562a4dbacbaa4b6283b (README), then this
  record commit.
- Server: replayed chore edits, due dates, skips, starts, pauses, archive, unarchive and
  deletes carry `?changedAt=`. A change older than the chore's last change gets 409
  `{"superseded":true}`; a newer one wins and becomes the chore's change time; a delete
  follows the same rule; a completion is always kept (its time is the phone's change time
  when none is given); a time more than 30 s ahead gets 400. Without `changedAt` (online use)
  nothing changes. Pictures answer with `Vary: Origin` (open item 7).
- Phone: each queued command carries its time and the person who queued it. A superseded (or
  gone) edit is dropped and the app says once "1 change was replaced by a newer one: <chore>"
  (Arabic with every plural form); a superseded completion or create is kept as failed, never
  dropped. Replay sends only the signed-in person's commands; a forced sign-out and a sign-in
  clear only the server copy (open item 5). Older commands without a person go with whoever
  signs in.
- Checks: Go build, `go vet` (only the known `pool.go:218`), `go test ./...` (all packages
  ok, new `change_time_test.go`: older loses, newer wins, due date and skip, delete beats an
  older edit, completion kept, future refused, `asset_vary_test.go`). Web: build, lint (0
  errors, 1897 warnings as before), node tests 55 of 56 (only the known
  `task-editor-compatibility` failure; new `offline-outbox.test.mjs`, 7 tests), prettier.
- Browser, 127.0.0.1, made-up household (Sam, Kim), the packaged Windows server of this
  branch, Edge, English and Arabic, 22 of 22: Kim skips a chore offline (queued, tagged with
  Kim, server unchanged); Sam changes it online later; on reconnect Sam's change stays, the
  note names the chore, nothing is left waiting. Kim skips another chore offline, the session
  expires; on reconnect the app signs out to the faces, the skip stays on the device and the
  server is unchanged; after Kim's PIN sign-in the skip is sent. Two "Transition was skipped"
  page errors on PIN sign-in also happen on main (e7f4d6b1, same flow), so not from 017.
- Limits: a phone clock more than 30 s fast gets its queued changes refused (kept as failed;
  README). Photos and thumbs-ups are not queued offline (as upstream); they need the
  connection.
- The owner: open the PR and merge; after the next install, try it on a phone (airplane mode,
  change a chore, reconnect).
