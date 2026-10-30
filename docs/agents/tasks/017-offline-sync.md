# Task 017: offline copy and outbox sync

- **Status:** in progress (owner answered, 2026-10-30)
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

- (to fill in)
