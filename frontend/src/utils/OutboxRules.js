// Task 017: one outbox per person, and what replay does with each answer.
// Kept free of browser and Capacitor imports so node tests can load it.

const isMissing = value => value === null || value === undefined

// The signed-in person, from the session token's own claim (the username the
// server put there). null when nobody is signed in or the token is unreadable.
export const outboxOwnerFromToken = token => {
  if (!token || typeof token !== 'string') return null
  const part = token.split('.')[1]
  if (!part) return null
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json = decodeURIComponent(
      Array.from(
        atob(padded),
        ch => `%${ch.charCodeAt(0).toString(16).padStart(2, '0')}`,
      ).join(''),
    )
    const id = JSON.parse(json)?.id
    return isMissing(id) || id === '' ? null : String(id)
  } catch {
    return null
  }
}

// A command belongs to the person who queued it. Commands queued before
// outboxes were per person carry no owner and go with whoever is signed in.
export const belongsTo = (command, owner) =>
  isMissing(command?.owner) || (!isMissing(owner) && command.owner === owner)

// The time a queued change was made on the phone, added to its request so the
// server can let the most recent change win.
export const withChangeTime = (path, changedAt) => {
  if (isMissing(changedAt)) return path
  const time = new Date(changedAt)
  if (Number.isNaN(time.getTime())) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}changedAt=${encodeURIComponent(time.toISOString())}`
}

// Changes to a chore that may since have been deleted: the delete was the
// newer change, so they are dropped with the note too (owner, 2026-10-30).
const REPLACED_WHEN_GONE = new Set([
  'update_chore',
  'reschedule_chore',
  'skip_chore',
  'start_chore',
  'pause_chore',
  'archive_chore',
  'unarchive_chore',
])

// What replay does with an error answer:
//   'replaced' drop it and name the chore in the note,
//   'done'     drop it silently,
//   'failed'   keep it as failed (never for a change that lost),
//   'retry'    keep it pending for the next run.
export const replayOutcome = (commandType, status) => {
  if (status === 409) {
    // A change that lost to a newer one. Completions are never dropped.
    return REPLACED_WHEN_GONE.has(commandType) || commandType === 'delete_chore'
      ? 'replaced'
      : 'failed'
  }
  if (status === 404) {
    return REPLACED_WHEN_GONE.has(commandType) ? 'replaced' : 'done'
  }
  if (
    status >= 400 &&
    status < 500 &&
    status !== 401 &&
    status !== 408 &&
    status !== 429
  ) {
    return 'failed'
  }
  return 'retry'
}

// The chore names for the note, once each, in the order they were dropped.
export const replacedNames = names => [
  ...new Set(names.filter(name => typeof name === 'string' && name.trim())),
]
