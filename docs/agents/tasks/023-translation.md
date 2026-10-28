# Task 023: chore names and details in the other language

- **Status:** delegated (plan run first)
- **Branch and worktree:** `task/023-translation` from `main` (c0bd39bf375450a0a969c5a5864f71382612a45b),
  in `C:\dev\wt\wuzzanext-023-translation`
- **Hand-off:** Codex (default model and effort), a read-only plan run first; supervisor reviews
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

- Commits (full hashes), tests, what was checked by hand, what is left, what the owner must do.
