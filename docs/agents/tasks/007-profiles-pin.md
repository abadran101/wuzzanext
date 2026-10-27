# Task 007: profiles with PIN sign-in and a person switcher

- **Status:** proposed (plan run first)
- **Branch and worktree:** `task/007-profiles-pin` from `main` (724a3e1), in
  `C:\dev\wt\wuzzanext-007-profiles-pin`
- **Hand-off:** Codex, read-only plan first, then a write run; supervisor reviews
- **Shares:** `backend/internal/user/`, `backend/internal/auth/`, `frontend/src/hooks/useAuth.jsx`,
  sign-in views, profile settings; 009 and 010 build on the profiles
- **Your time:** ~15 min (answer the plan's questions, try sign-in, merge)
- **Who:** Claude -> Codex -> You
- **Waits on:** the owner's answers to the plan's questions

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

- Pending.
- Progress (2026-10-27): Codex plan run blocked (its sandbox got "Access is denied" on
  this worktree; reported to the owner through the orchestrator, no workaround tried). The
  supervisor wrote the plan from the code and sent six questions (who sees the faces screen,
  who manages profiles, parents on PIN, lockout, kids' powers, tablet idle return) plus the
  two Arabic questions. Next: the owner's answers and a fix for Codex's access, or a switch
  of coding provider. Nothing committed yet besides this branch's creation.
