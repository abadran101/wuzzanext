# Task 024: menu items hidden from regular users

- **Status:** delegated
- **Branch and worktree:** `task/024-menu-visibility` from `main` (963c84d0c69926e3e7e7ae29bcb82d8a1ae71742), in
  `C:\dev\wt\wuzzanext-024-menu-visibility`
- **Hand-off:** Codex (default model and effort), supervisor reviews
- **Shares:** the navigation (`NavBar.jsx`) and Settings > Family with 022 (Arabic texts come
  after this task)
- **Your time:** ~10 min (look at the menu as Alex and as Sam, merge)
- **Who:** Claude → Codex → Claude → You
- **Waits on:** nothing (PR #9 merged; the owner approved doing 024 before 022 and 023)

## Goal

Regular (non-admin) family members see a shorter menu: Archived, Things, Labels and Report an
Issue are hidden for them by default. Admins always see every item, and in Settings > Family
an admin can switch each of those four items on or off for all regular users at once.

## Owner's answers (2026-10-27, through the orchestrator)

- "hide Archived, Things, Labels and Report an Issue from regular users, and let admins
  toggle menu items visible or hidden for other users."
- "Those can be hidden for all non admin users (not user specific) and no need to block the
  actual pages"
- Order: "yes" to doing 024 before 022 and 023.

## Read first

- `frontend/src/views/components/NavBar.jsx` (side bar items, Report an Issue button)
- `frontend/src/utils/BottomNavConfig.js` (phone bottom bar, Archived option)
- `frontend/src/search/GlobalSearchPalette.jsx` (navigation shortcuts to the same pages)
- `frontend/src/views/Settings/HouseholdProfileSettings.jsx` (Family section, admins only)
- `backend/internal/circle/model/model.go`, `backend/internal/circle/handler.go`,
  `backend/internal/circle/repo/` (household = circle; roles admin / member)
- `backend/internal/user/repo/profiles.go` (`HouseholdCircle`, `profileAdmin`, from task 007)

## Limits that apply

- `AGENTS.md`: no commits, no network, no lock-file changes, made-up data in tests.
- Admin means role `admin` in the household circle, as in task 007. Everyone else is a
  regular user.
- Hide only. The pages, routes and API stay reachable by URL (owner's answer).
- One setting per household, not per person, stored on the home server so every device
  agrees.
- Every new text in English and Arabic (`frontend/public/locales/{en,ar}/`). Fun and simple:
  one switch per item, little text.

## What to do

1. Backend: one per-circle setting listing which of the four items regular users see
   (`archived`, `things`, `labels`, `reportIssue`). Existing and new circles default to none
   shown. `GET` readable by any member of the circle; `PUT` only by an admin of the circle
   (impersonation does not count); unknown item names rejected.
2. Frontend: a single place that decides whether an item shows for the current person
   (admin: always; regular: only if the household setting shows it). Use it in the side bar,
   the phone bottom bar, the global search shortcuts and Report an Issue.
3. Settings > Family (admins only): four switches, saved straight away.
4. Tests: Go (default hidden, admin can change, member and impersonating admin refused,
   unknown name rejected, other circle unaffected); node (visibility rule for admin and
   regular, every new text in English and Arabic).
5. README: one line in the profiles section.

## Acceptance

- `go build ./...`, `go vet ./...` (only the known `internal/realtime/pool.go:218`),
  `go test ./...` all ok; gofmt clean.
- `npm run build` ok; `npm run lint` exit 0 with no new warnings (1904 before);
  `node --test "tests/*.test.mjs"` all new tests pass (one known upstream failure).
- By hand: as Alex (admin) all items show; as Sam (regular) the four are gone; Alex turns
  Things on and Sam sees Things after a refresh; Sam can still open `/things` by address.

## Result (filled in before the push, in the task's own branch)

- Commits (full hashes), tests, what was checked by hand, what is left, what the owner must do.
