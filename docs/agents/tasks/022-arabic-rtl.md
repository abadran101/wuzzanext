# Task 022: Arabic everywhere, right to left

- **Status:** delegated (plan run first)
- **Branch and worktree:** `task/022-arabic-rtl` from `main` (19e3923c76d9b1b9129e649d00ddd9242e11d107),
  in `C:\dev\wt\wuzzanext-022-arabic-rtl`
- **Hand-off:** Codex (default model and effort), a read-only plan run first; supervisor reviews
- **Shares:** the locale files and many screens; 023 (translating family-typed text) comes after
- **Your time:** ~30 min (read the Arabic wording, look at a few screens in Arabic, merge)
- **Who:** Claude → Codex → Claude → You
- **Waits on:** nothing (PR #10 merged)

## Goal

With Arabic chosen (one tap in the user menu since 007), every screen of the app shows Arabic
text and reads right to left: no English left in menus, buttons, messages, dates or empty
states, and arrows and layouts point the right way. Text the family types (chore and recipe
names) stays as typed; translating it is task 023. The owner reviews the Arabic wording
before merge.

## Owner's words (through the orchestrator)

- 2026-10-27: "the web and mobile apps need to have an easy toggle button that switches the
  language of the entire app's content to be displayed in arabic" (very important).
- 2026-10-27: the owner reviews the Arabic wording when 022 is done: "I can review it".

## What is known (supervisor's measurements on main 19e3923c)

- 3024 English texts in `frontend/public/locales/en/`; 299 have no Arabic in
  `frontend/public/locales/ar/`: chores 89, common 10, points 2, projects 41, rewards 38 (no
  Arabic file at all), settings 119. 11 Arabic entries are still the English text.
- Layout already flips: `src/contexts/ThemeContext.jsx` uses `stylis-plugin-rtl`, and
  `LocalizationContext.jsx` sets `dir` on the page.
- Dates: `src/i18n/config.js` imports no `moment/locale/ar`, so dates and "2 hours ago" stay
  English; `formatCalendar` in `LocalizationContext.jsx` hard-codes "Today", "Tomorrow",
  "Yesterday", "Last".
- 23 uses of left/right arrow and chevron icons that may need flipping in right to left.

## Read first

- `frontend/src/i18n/config.js`, `frontend/src/contexts/LocalizationContext.jsx`,
  `frontend/src/contexts/ThemeContext.jsx`
- `frontend/public/locales/en/*.json` and `frontend/public/locales/ar/*.json`
- `frontend/tests/` (node tests, pure logic)

## Limits that apply

- `AGENTS.md`: no commits, no network, no lock-file or dependency changes, made-up data only.
- Arabic: Modern Standard Arabic, short, friendly, the same tone as the existing Arabic texts;
  keep `{{placeholders}}` and plural keys exactly; Western digits are fine unless the existing
  Arabic texts use Arabic-Indic ones in the same place.
- No new libraries. Logical CSS properties in new code. English must look and work as before.
- Upstream Donetick code may be changed only where needed for texts and direction.

## What to do

1. Fill every missing Arabic text (create `ar/rewards.json`) and fix the 11 still in English
   (brand names and units may stay).
2. Find English hard-coded in the code (JSX text, toasts and snackbars, `aria-label`, `title`,
   `placeholder`, alerts, empty states, the calendar words) and move it into the locale files,
   English and Arabic.
3. Dates and times in Arabic: load the moment Arabic locale and translate the calendar words.
4. Right to left: flip direction-bearing icons (back/forward arrows, chevrons) and anything the
   style plugin cannot flip (inline `style`, canvas or SVG positions, swipe directions,
   drawer side, text alignment set in code).
5. A node test that every English key exists in Arabic, for every namespace, with the same
   `{{placeholders}}`.
6. README: one line on Arabic and right to left.

## Acceptance

- `npm run build` ok; `npm run lint` exit 0 with no new warnings (1904 before);
  `node --test "tests/*.test.mjs"` new tests pass (one known upstream failure).
- Backend untouched, or `go build`, `go vet`, `go test ./...` as before if it changes.
- By hand in Arabic: home, chores list, a chore's details and edit, settings, family, points,
  projects, history: no English left except family-typed text; arrows point the right way;
  dates in Arabic. English unchanged.
- The owner has reviewed the Arabic wording (list sent with the PR).

## Result (filled in before the push, in the task's own branch)

- Commits (full hashes), tests, what was checked by hand, what is left, what the owner must do.
