# Translating chore names and details (owner setup)

Wuzzanext can show chore names and chore details in the reader's language: an English
chore appears in Arabic for someone using the app in Arabic, and an Arabic chore appears in
English for someone using it in English. The home server asks Google Cloud Translation for
this. It is **off** until you do the steps below on the home server.

## What is sent, and what is not

- Sent to Google: chore names and chore details (and, later, recipe names), only when a
  family member opens a list or a chore in the other language. Names written inside a chore's
  text are sent as written.
- Never sent: profile names, PINs, photos, notes, history, points, or anything else.
- Sent from the home server only, over HTTPS to `translation.googleapis.com`. Phones and
  browsers never talk to Google.
- Each answer is kept on the home server, so the same text is sent at most once per language.
  A text that is already in the reader's language is remembered without a copy of it.
- Editing a chore always edits the original text. The chore page shows **Translated** with a
  **See original** button.

## Cost

Google gives 500,000 characters per month of basic translation free; after that it charges
about USD 20 per million characters (check the current price on Google's Cloud Translation
pricing page before you start). Two limits keep you inside the free allowance:

1. A Google quota of 15,000 characters per day (15,000 x 31 days = 465,000).
2. The server's own count, `daily_char_limit` (15,000 by default, per UTC day). Over the
   limit, chores simply show in their original language until the next day.

## Steps (once, in a web browser, with your Google account)

1. Open the Google Cloud console and create a project, for example `wuzzanext-translation`.
   Link a billing account (Google requires one even for the free allowance).
2. **APIs & Services > Library**: enable **Cloud Translation API**.
3. **APIs & Services > Credentials > Create credentials > API key**. Then edit the key:
   - API restrictions: **Restrict key** to **Cloud Translation API** only.
   - Application restrictions: **IP addresses**, with the home network's public IP address,
     if your internet provider gives you a fixed one. Otherwise leave it at None.
   - Copy the key. Keep it only for step 6; never paste it into a chat, an email or this
     repository.
4. **APIs & Services > Cloud Translation API > Quotas**: find the characters-per-day quota
   (named like "v2 and v3 general model characters per day") and set it to `15000`.
5. **Billing > Budgets & alerts**: create a budget of USD 1 for this project with an email
   alert at 50% and 100%. Success looks like: the budget is listed with the alert thresholds.

## Steps on the home server (signed in as the server's administrator)

6. Give the key to the server through its environment, not through a command line (so it is
   not saved in a command history):
   - Start > "Edit the system environment variables" > **Environment Variables** >
     **System variables** > **New**.
   - Name `DT_TRANSLATION_API_KEY`, value: the key from step 3. OK.
   - Add one more: name `DT_TRANSLATION_ENABLED`, value `true`. OK.

   Alternatively, put them in the server's own `selfhosted.yaml` (never in the repository):

   ```yaml
   translation:
     enabled: true
     provider: "google"
     daily_char_limit: 15000
     api_key: "<your key>"
   ```

7. Restart the Wuzzanext service, so it reads the new settings.
8. Check: open the app, switch the language in the user menu to the other language, and open
   the chore list. An English chore should now show in Arabic (or the reverse); the chore page
   shows **Translated** and **See original**. Want: translated names after a second or two.
   If nothing changes, see below.

## If it does not work

- The server shows translations only when it is enabled **and** has a key. Check both
  variables, then restart the service again.
- The home server needs outbound HTTPS to `translation.googleapis.com`.
- A wrong or restricted key makes chores stay in their original language; the server log
  says "translation service answered 403" (the key is never written to the log).

## Turning it off

Set `DT_TRANSLATION_ENABLED` to `false` (or delete it) and restart the service. Nothing is
sent from then on. To stop it for good, also delete the key in the Google Cloud console
(**APIs & Services > Credentials**). Answers already kept on the server stay in its database
until it is reset; they hold only translated chore texts.

## For testing (developers)

`provider: "fake"` with `enabled: true` turns the feature on without a key and without any
connection out: it shows `[ar] ` or `[en] ` in front of the original text. Tests use it or a
stand-in translator; they never call Google.
