# Task 022: Arabic everywhere, right to left

- **Status:** done (PR open; the owner reviews the Arabic wording before merge)
- **Branch and worktree:** `task/022-arabic-rtl` from `main` (19e3923c76d9b1b9129e649d00ddd9242e11d107),
  in `C:\dev\wt\wuzzanext-022-arabic-rtl`
- **Hand-off:** Codex (plan, run 1, run 2 part 1); the supervisor wrote run 2 part 2 and run 3
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

## Supervisor's choices (after Codex's plan run; not the owner's decisions)

- `src/views/Landing/` is left out: nothing imports it, so no one sees it.
- Typing dates in words ("every Monday at 5pm") keeps working in English only; in Arabic the
  help text says so instead of promising Arabic input. Arabic date words can be a later task.
- Three write runs: (1) Arabic locale files, a parity test, README; (2) hard-coded English moved
  into the locale files; (3) dates, calendars and right-to-left fixes.

## Progress (supervisor)

- Run 1 done: a26cf7f8a0ac903f80e7de7d1809963d9b63244d (299 Arabic texts, ar/rewards.json, 54
  plural families with six forms, parity test, README).
- Run 2 part 1: 4b56d006b78b61a2e5611bc6a3a0c64fa97acd4c (Codex hit its usage limit mid-run; about
  50 files; builds, lint 0 errors / 1897 warnings, node 25 pass + 1 known). Colour names and home
  sections have keys but are not rendered yet.
- 2026-10-27 21:22: Codex lost sandbox access again (the queued part 2 got "Access is denied"
  for the worktree and `C:\dev\scratch`; a read-only check saw no git repository). No
  workaround tried.
- 2026-10-28: the supervisor writes run 2 part 2 and run 3 itself (owner, through the
  orchestrator: "yes" to "Should Wuzzanext write the rest of 022 itself?").
- Run 2 part 2: cd46d7e61622640631890933841ded4eeac3878d (supervisor: realtime and timer
  messages, Wuzzanext wordmark on the onboarding screens).
- Run 3: 416cbbae8552e118420cbd0c3b87cbc7dc9e97f7 (supervisor: dates, calendars, right to left).
- Wording points for the owner: the Arabic dual form repeats the number ("نقطتان (2)") because
  every form keeps `{{count}}`; "thing" = شيء; "rotate link" = استبدال الرابط.

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

- Commits: 21d4406f17d0b6f4ed7cd6961815fadcaa002d08 (task file),
  a26cf7f8a0ac903f80e7de7d1809963d9b63244d (run 1), 4b56d006b78b61a2e5611bc6a3a0c64fa97acd4c (run 2
  part 1), cd46d7e61622640631890933841ded4eeac3878d (run 2 part 2),
  416cbbae8552e118420cbd0c3b87cbc7dc9e97f7 (run 3), then this record.
- Done: every English text has Arabic (parity test, same placeholders, six plural forms);
  hard-coded English moved into the locale files (Landing left out, unused); dates in Arabic
  (moment Arabic locale, Today/Tomorrow/Yesterday/Last from the locale files, calendars' weekday
  letters, months and header in the app language, displayed dates too); arrows and chevrons that
  point somewhere mirror in Arabic; page transitions slide the other way; the rich text editor
  aligns to the start. The drawer already opens from the right (the style plugin flips it).
- Supervisor's choices: Arabic dates keep Western digits (1, 2, 3), so typed and stored dates
  stay safe; English keeps the browser's own date format, as before. Swipe rows keep their
  English geometry (swipe right reveals the same actions as in English). Typing dates in words
  stays English-only. Logout, undo/redo, "open in new" and trend icons are not mirrored.
- Checks (frontend): `npm run build` ok; `npm run lint` exit 0, 0 errors, 1897 warnings (1904
  before, 7 fewer); `node --test "tests/*.test.mjs"` 25 pass, 1 known upstream failure
  (task-editor-compatibility). Backend untouched. Secret scan of the diff: counts in the PR report.
- Not checked by hand by the supervisor: no browser automation on the dev machine, so the
  screens in Arabic are for the owner's look in the test app (Alex, Sam; made-up people).
- Owner: review the Arabic wording (all of it is in `frontend/public/locales/ar/`; the points to
  look at first are listed under Progress, plus the Western digits in dates), look at a few
  screens in Arabic, then merge. 023 (translating family-typed text) comes next.
