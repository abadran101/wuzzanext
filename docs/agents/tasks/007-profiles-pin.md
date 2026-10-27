# Task 007: profiles with PIN sign-in and a person switcher

- **Status:** done
- **Branch and worktree:** `task/007-profiles-pin` from `main` (724a3e1), in
  `C:\dev\wt\wuzzanext-007-profiles-pin`
- **Hand-off:** Codex, read-only plan first, then a write run; supervisor reviews
- **Shares:** `backend/internal/user/`, `backend/internal/auth/`, `frontend/src/hooks/useAuth.jsx`,
  sign-in views, profile settings; 009 and 010 build on the profiles
- **Your time:** ~15 min (answer the plan's questions, try sign-in, merge)
- **Who:** Claude -> Codex -> You
- **Waits on:** nothing (owner answered, Codex access restored, 2026-10-27)

## Goal

Each family member has a profile with a name, an avatar and a colour. On a shared device
anyone can tap their face and type a 4-digit PIN to be signed in as themselves, and switch to
someone else just as fast. No heavy security: the data is harmless family information, and
the server is reachable only on the home network.

## Read first

- `docs/BRIEF.md`, "Users and sign-in"
- `docs/INVENTORY.md`, "Users and sign-in" (what Donetick already has, with paths)
- `backend/internal/user/model/model.go` (`User`), `backend/internal/user/handler.go`
  (child users, passwords), `backend/internal/auth/` (JWT, impersonation)
- `frontend/src/hooks/useAuth.jsx`, `frontend/src/components/UserProfileAvatar.jsx`,
  `frontend/src/views/Settings/ProfileSettings.jsx`, the sign-in views under
  `frontend/src/views/Authorization/`

## Limits that apply

- No new outside services. Made-up family names in tests (for example "Alex", "Sam").
- No dependency or lock-file changes unless the plan says why and the owner agrees.
- Database changes go through the project's existing migration mechanism; existing
  accounts keep working.
- PINs are stored hashed, never in plain text and never logged.
- License files and the APK signing setup stay untouched.
- Every new text goes through i18n (`frontend/public/locales/`), in English and Arabic, and
  the new screens work right to left (owner requirement of 2026-10-27; the toggle itself is
  task 022). The picker and PIN pad are the first screens, so they must be usable in Arabic.

## Owner's answers (2026-10-27, through the orchestrator)

- Everyone is an adult; roles are admin and regular user, no child accounts.
- The faces screen (profile picker) shows to anyone who opens the app; the server is on the
  home network only.
- Admins create profiles and can reset any PIN; each person changes their own PIN.
- Admins sign in by PIN too; their password stays as a backup.
- 5 wrong PINs: that profile waits 1 minute.
- Per-device on/off setting: a shared tablet returns to the faces after 5 minutes unused;
  personal phones stay signed in.
- The language choice is stored per person on the server (used by task 022).

## What to do

1. Plan (read-only): how profiles, colour, PIN sign-in and the switcher fit Donetick's users,
   circles, child accounts and JWTs; what changes where; the questions for the owner.
2. After the owner answers: implement backend (colour, PIN hash, PIN sign-in endpoint with a
   simple attempt limit, profile list for the picker) with Go tests.
3. Frontend: profile picker with avatars and colours, PIN pad, switch-person action, colour
   picker in profile settings.
4. README and docs updated for what changed.

## Acceptance

- `go build ./...`, `go test ./...` pass (new tests for PIN sign-in included); `go vet` only
  the known `pool.go:218`.
- `npm run build` ok, `npm run lint` exit 0, node tests: only the known upstream failure.
- By hand: two made-up profiles, sign in as one by PIN, switch to the other, wrong PIN
  refused.

## Result (filled in before the push, in the task's own branch)

- **Done** (2026-10-27). Plan by Codex (read-only) after the owner's answers; code by Codex,
  reviewed and corrected by the supervisor. Commits:
  - 8ea6f4f67c8a9f1e6f7317371df335700de4467b: records the Arabic requirement (task 022), the
    translation decision (task 023) and the owner's `CLAUDE.md` section 3 exception for
    Google Cloud Translation (typed by the owner in the supervisor's window); this task file.
  - c38e02fc6bfb8134e36d17581ad48b49032dd4d0 and c603e8eef977a9bbfcd8f371b9959aea814deac1:
    the owner's answers; the owner reviews the Arabic wording in 022.
  - 705c3283b76553d155aad810cc11b145f2908d9f: server. Colour (8-colour palette), language and
    bcrypt PIN hash per user; public `GET /auth/profiles` (household members only: name,
    picture, colour, PIN set; no email, role or secrets); `POST /auth/pin` signs in through
    the same token, refresh-cookie and MFA path as the password; 5 wrong PINs lock the
    profile for 60 s (atomic compare-and-swap, capped retries); admins create adult profiles
    and reset PINs, impersonation refused; everyone changes their own PIN; household =
    the only circle, or `household.circle_id` in the server's configuration; migration
    gives existing users a colour. Supervisor fixes: field placement and column tags, retry
    cap on the PIN check.
  - dedd2c0efb51d4bd24f688c44ba4420bef26548b: web and Android. Faces screen with PIN pad
    (keypad stays left to right in Arabic, shake on wrong PIN, lock countdown), password form
    kept as a backup; Switch person in the user menu (syncs first, refuses while offline
    changes wait, clears cached data); per-device shared-tablet setting (back to the faces
    after 5 idle minutes, background time included); profile colour, language saved per
    person, PIN change; admins' Family section; child-account screens hidden; English and
    Arabic texts; README section. Supervisor fix: sign-in clears the offline outbox again as
    upstream did, so one person's queued changes are never sent as another's.
  - 01972a98b985086982da40798f40bc6f7ca83c33: Log out (user menu, side bar, "use a different account") waits for
    offline changes to sync like Switch person, and refuses with a short message while they
    can't be sent (owner, through the orchestrator, 2026-10-27: "yes").
- **Checked:** `go build ./...` ok; `go vet` only the known `pool.go:218`; `go test ./...`
  25 packages ok (9 new tests: PIN sign-in and refresh, lockout and expiry, concurrent wrong
  PINs, profile list scope and no secrets, admin rules, own PIN rules, preferences, MFA,
  colour migration); gofmt clean. `npm run build` ok; `npm run lint` exit 0 (0 errors, 1904
  warnings); node tests 8 pass, only the known upstream failure (new: PIN input, lock
  countdown, idle timer, switch guard, every new text in English and Arabic).
- **Left:** the by-hand check in a browser and on a phone (faces, PIN, switch, wrong PIN,
  right-to-left) was not run on the dev machine; the owner tries it. The one-tap Arabic
  toggle is task 022. For 017 (STATUS open item 5): a forced sign-out when a session expires
  still empties the offline queue, as upstream does; it needs one queue per person.
- **Owner:** review the PR (it also carries the `CLAUDE.md` change), try the faces screen and
  PIN sign-in, merge.
