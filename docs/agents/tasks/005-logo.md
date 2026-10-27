# Task 005: logo

- **Status:** done
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

- **Done** (2026-10-27) by the supervisor in one commit,
  6135eec241121e7a9400ee486d3748d1f9ef2ba2, then main (71262c6, task 021) merged in
  (99fa1ac842c5d2bac3aa7979035802a609936f7f, no conflicts).
- `assets/logo/make-logo.mjs` makes `logo-tile.png` (1748 x 1748: the rounded tile with
  its flames; the outline is a measured superellipse, anti-aliased) and
  `logo-character.png` (1462 x 1462: the character with its hat and head flames, cut by
  colour from the teal and kept as the largest connected shape). Both checked by eye: clean
  edges, no teal halo.
- `assets/logo/make-icons.mjs` renders from them: favicons (16, 32, .ico), Android Chrome,
  PWA (64, 192, 512; 64 was referenced but missing), maskable (character on the tile's
  teal), Windows tile, Apple touch icons (on white), the in-app logo
  `frontend/src/assets/logo.png`, the Capacitor sources in `frontend/resources/`, and
  every Android launcher icon (square, round, adaptive foreground at a size that fits the
  circle mask) and splash screen (character on white, or #111 for night). Contact sheet
  checked by eye.
- The navigation bar, `Logo.jsx`, the landing footer and hero use the PNG. Removed: the
  Donetick `logo.svg` (public and src), `safari-pinned-tab.svg`, the stale
  `public/manifest.webmanifest` (vite-plugin-pwa writes the real one), the unused
  `src/manifest/` and `frontend/icons/`. Windows tile colour set to the logo's teal.
  README describes `assets/logo/` and how to regenerate the icons.
- **Checked:** `npm run build` ok (built manifest lists the new icons, no SVG logo in
  `dist`); `npm run lint` exit 0 (0 errors, 1906 warnings); node tests: only the known
  upstream failure; no `logo.svg` or `safari-pinned-tab` reference left in `src`,
  `public`, `index.html` or `vite.config.mjs`.
- **Left:** `frontend/assets/` (pictures for the upstream frontend README), the Android
  widget previews in `drawable-nodpi` and iOS stay as they are; the APK itself is task 016.
- **Owner:** look at the icons in the PR, then merge.
