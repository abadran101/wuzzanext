# Task 005: logo

- **Status:** ready
- **Branch and worktree:** `task/005-logo` from `main` (b90b8f3), in
  `C:\dev\wt\wuzzanext-005-logo`
- **Hand-off:** supervisor. The cut-outs need checking by eye after each step, which Codex
  can't do; the wiring is small and follows from the generated files.
- **Shares:** `frontend/public/`, `frontend/src/assets/`, `frontend/android/app/src/main/res/`;
  016 (APK) builds on it
- **Your time:** ~10 min (look at the two cut-outs and the icons, merge)
- **Who:** Claude -> You
- **Waits on:** nothing (004 merged)

## Goal

Wuzzanext shows the family's own cartoon everywhere: browser tab, home-screen and PWA
icons, the Android launcher icon and splash screen, and the logo inside the app. No Donetick
logo is left.

## Read first

- `docs/BRIEF.md` (Overview, Logo); the owner's decision of 2026-10-26 in
  `docs/agents/STATUS.md`
- `assets/logo/logo-original.jpg` (2000 x 2000)
- `frontend/index.html`, `frontend/vite.config.mjs` (PWA icons), `frontend/src/Logo.jsx`,
  `frontend/android/app/src/main/res/`

## Limits that apply

- The owner's decision (2026-10-26): for the app icon, Android launcher icon and favicon,
  remove only the outer teal background and keep the rounded tile with the flames; for in-app
  graphics, cut out the character alone. Both transparent PNGs from the original.
- Images are made with the tools already in the project (`sharp`, `@capacitor/assets`), no
  online services. Lock files, license files and signing stay untouched.

## What to do

1. Make `assets/logo/logo-tile.png` (outer background removed) and
   `assets/logo/logo-character.png` (character alone) with a small repeatable script in
   `assets/logo/`.
2. Regenerate the web icons in `frontend/public/` (favicons, touch, PWA, maskable, tile) from
   the tile.
3. Regenerate the Android launcher icons and splash screens from the tile and the character.
4. Use the character for the in-app logo (`Logo.jsx`, navigation bar); remove the old
   Donetick logo files that nothing uses any more.

## Acceptance

- The two PNGs have transparent backgrounds and clean edges, checked by eye.
- `npm run build` ok, `npm run lint` exit 0, node tests: only the known upstream failure.
- No Donetick logo left in `frontend/public/`, `frontend/src/assets/` or the Android
  resources.

## Result (filled in before the push, in the task's own branch)

- Pending.
