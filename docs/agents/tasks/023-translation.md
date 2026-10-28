# Task 023: chore names and details in the other language

- **Status:** done (PR open)
- **Branch and worktree:** `task/023-translation` from `main` (c0bd39bf375450a0a969c5a5864f71382612a45b),
  in `C:\dev\wt\wuzzanext-023-translation`
- **Hand-off:** Codex plan run; the supervisor wrote the code (Codex lost sandbox access)
- **Shares:** chore screens and the locale files (022 is merged); 013 later reuses the service
  for recipe names
- **Your time:** ~30 min (review, merge; the Google key setup on the home server comes with the
  first deployment)
- **Who:** Claude → Codex → Claude → You
- **Waits on:** nothing (PR #11 merged)

## Goal

When someone reads the app in Arabic, chore names and chore details that were typed in English
show in Arabic, and the other way round. The home server asks Google Cloud Translation once per
text and keeps the answer, so the same text is never sent twice. Without a key (or over the
daily limit) the app simply shows the text as typed. Recipe names use the same service when
recipes arrive (task 013); there are none yet.

## Owner's decisions (through the orchestrator)

- 2026-10-27: family-typed text is translated with Google Cloud Translation (free up to 500,000
  characters a month; "the data shared is not sensitive"). `CLAUDE.md` section 3 allows only
  chore names, chore details and recipe names, English <-> Arabic; the key lives only in the
  home server's configuration.
- 2026-10-27: only chore names, chore details and recipe names are sent, never profile names;
  names inside chore text are sent as they are; a daily quota in Google Cloud keeps usage in the
  free allowance (the owner checks pricing before choosing the newer LLM model); the server
  connects out to the translation endpoint only.

## Read first

- `backend/config/config.go`, `backend/config/selfhosted.yaml.example`
- `backend/internal/chore/` (model, repo, handler), `backend/internal/database/migration.go` and
  `migrations/`, how `main.go` wires a package (fx)
- `frontend/src/queries/` (react-query), the chore views that show the name and the details
  (cards, list rows, details page), `frontend/src/i18n/config.js`

## Limits that apply

- `AGENTS.md`: no commits, no network, no real keys, made-up data only; no lock-file or
  dependency changes (Go standard `net/http` is enough).
- Tests never call Google: they use a fake translator (and `httptest` for the client).
- No key, key placeholder or internal hostname in the repository. The key comes only from the
  server's configuration (environment variable or the git-ignored `selfhosted.yaml`); the API
  never returns it and logs never print it.
- Send only chore names and chore details (and later recipe names). Never profile or user names,
  labels, comments, or anything else.
- Basic model (Cloud Translation v2, "nmt"); no LLM model.
- English must look and work exactly as before when the text is already in the reader's language.

## What to do

1. Backend package `internal/translation`: a `Translator` interface; a Google client (v2 REST,
   API key from configuration, a short timeout); a cache table keyed by a hash of the source text
   and the target language (the text itself stored for the answer only); a daily character limit
   counted by the server (default within the free tier, about 15,000 a day), after which it
   answers "not translated" until the next day.
2. Configuration: `translation.enabled`, `translation.api_key` (also from `DT_TRANSLATION_API_KEY`),
   `translation.daily_char_limit`, and `translation.provider` (`google`, or `fake` for local
   testing: it marks the text instead of translating, and sends nothing). Off, or without a key,
   nothing is ever sent.
3. An authenticated endpoint that takes a chore id (or a list) and a target language (`en` or
   `ar`) and returns the translated name and details, read from the chore on the server, so the
   client cannot send arbitrary text. The circle's normal access rules apply.
4. Frontend: when the app language differs from the text's language, show the translated name
   and details on the chore cards, list rows and the details page, with a small way to see the
   original. React-query caches the answers; no request when translation is off.
5. Tests: Go tests with a fake translator (cache hit sends nothing, limit stops sending, off
   sends nothing, only the allowed fields are sent, access rules); node test for any pure helper.
6. Docs: a short owner guide `docs/translation-setup.md` (no key values): create the Google Cloud
   project, enable the Cloud Translation API, create an API key restricted to that API (and the
   home server's public address if fixed), set the "characters per day" quota and a budget alert,
   put the key in the home server's configuration, restart, check.

## Acceptance

- Backend: `go build ./...`, `go vet ./...` (only the known pool.go:218 finding), `go test ./...`
  all ok with the new tests.
- Frontend: `npm run build` ok; `npm run lint` exit 0, 0 errors, no more than 1897 warnings;
  `node --test "tests/*.test.mjs"`: new tests pass (one known upstream failure).
- By hand in the test app with the fake translator: an English chore shows in Arabic when the app
  is in Arabic, the original is one tap away, English unchanged; with translation off nothing
  changes.

## Result (filled in before the push, in the task's own branch)

- Commits: 27392d97106d7c36f67ed8aa32bc1ff5a9af76a8 (task file and record),
  c803b74340bb2352474e56656fdc6a5050034049 (code, tests, docs), then this record commit.
- What it does: the home server translates chore names (as text) and chore details (as HTML)
  between English and Arabic with Cloud Translation v2 ("nmt"), only for chores the reader may
  see, at most 100 per request (`POST /api/v1/translations/chores`). Answers are cached by
  SHA-256 of the text, target and provider; text already in the target language is remembered
  without a copy. A daily character count per UTC day (default 15,000) is kept in the database;
  over it, chores show as typed. `/resource` says `translation_enabled` (on and a key, or the
  fake provider). Off by default.
- Web app: cards (normal, compact, archived) and the chore page show the translation, batched
  into one request per list; the chore page shows "Translated" with "See original" / "Show
  translation"; the original stays in the card's tooltip. Edits keep the original text. No
  request when translation is off, or when the text already looks like the reader's language
  (Arabic letters or not), so English readers of English chores see no change. Translated
  details whose markup differs from the original are not shown.
- Tests: Go `go build ./...` ok, `go vet ./...` only the known pool.go:218 finding,
  `go test ./...` all packages ok (new: translation service, Google client against
  `httptest`, handler with Alex and Sam incl. a private and another circle's chore, resource
  flag; the key never appears in answers or errors). Frontend `npm run build` ok; `npm run
  lint` exit 0, 0 errors, 1896 warnings; node tests 33 pass + the known
  task-editor-compatibility failure (new: `tests/translation.test.mjs`, 8 tests).
- By hand (local test app, fake translator, made-up user Alex): English chore and its details
  come back as "[ar] ..." for Arabic; an Arabic chore as "[en] ..." for English and unchanged
  for Arabic; unknown ids left out; `fr` gives 400; no token gives 401; with translation off,
  `translation_enabled` is false and the endpoint answers `enabled: false` with nothing sent.
  The screens were not looked at in a browser (no Playwright on this machine); the owner sees
  them with the first deployment.
- Left: recipe names reuse this service in task 013. Notifications, the calendar feed, search
  and widgets keep the original names.
- Owner: nothing before the merge. With the first deployment (019): the Google Cloud steps and
  the home-server key in `docs/translation-setup.md` (about 15 min; free up to 500,000
  characters a month, with a 15,000-a-day quota and a USD 1 budget alert).

## Progress (supervisor)

- Codex read-only plan run done (plan reviewed; supervisor changes: cache same-language answers
  too, one batch request per list, names as text and details as HTML, server-side daily count).
- First write run: the workspace-write sandbox cannot read `C:\dev\scratch`, so the plan was put
  into the prompt itself.
- Second write run: Codex lost sandbox access to the worktree again ("Access is denied"); no files
  changed. No workaround tried; asked the owner through the orchestrator.
- 2026-10-28: the supervisor writes 023 itself from the reviewed plan (owner, through the
  orchestrator: "yes, continue with Wuzzanext writing it itself for now"). This covers 023 only;
  later tasks go back to Codex once its sandbox access is fixed.
- 2026-10-28: sent the orchestrator the saved evidence on the three Codex "Access is denied"
  failures for the Tokenmaxximus agent (saved output only, no reruns).
- 2026-10-28: code commit c803b743; checks and the hand check passed (see Result).
