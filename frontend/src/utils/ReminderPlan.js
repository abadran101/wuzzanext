// Task 018: which due-task reminders this phone schedules, and what they say.
// The Android app schedules them itself from its own copy of the chores; no
// push service is involved (owner, 2026-10-26). Kept free of browser and
// Capacitor imports so node tests can load it.

// Android keeps at most 64 pending notifications per app.
export const MAX_REMINDERS = 64

// A chore that is done and waits for a parent's approval is not due.
const PENDING_APPROVAL = 3

// Canonical reminder template shape: a signed value plus 'm' | 'h' | 'd'.
// Negative is before due, positive is after, zero is on due.
export const DEFAULT_REMINDER_TEMPLATES = [
  { value: -1, unit: 'd' },
  { value: 0, unit: 'm' },
  { value: 1, unit: 'd' },
]

const UNIT_ALIASES = {
  minute: 'm',
  minutes: 'm',
  hour: 'h',
  hours: 'h',
  day: 'd',
  days: 'd',
}

const UNIT_MS = { m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 }

// Earlier builds stored {value: 1, unit: 'days', type: 'before'}. Nothing reads
// `type`, and an unknown unit would fire at the due time (or collide on id)
// instead of offsetting.
export const normalizeReminderTemplate = template => {
  const unit = UNIT_ALIASES[template?.unit] || template?.unit
  const value = Number(template?.value) || 0
  if (!template?.type) return { value, unit }
  if (template.type === 'ondue') return { value: 0, unit }
  return {
    value: template.type === 'before' ? -Math.abs(value) : Math.abs(value),
    unit,
  }
}

const STORAGE_KEY = 'defaultNotificationTemplate'

// The reminders a new chore starts with: the person's last choice on this
// device, or one day before, at the due time and one day after.
export const defaultReminderTemplates = (storage = globalThis.localStorage) => {
  try {
    const stored = storage?.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        // An empty list is a deliberate "no reminders by default", not a
        // missing value — respect it instead of re-seeding.
        const normalized = parsed.map(normalizeReminderTemplate)
        if (JSON.stringify(normalized) !== stored) {
          storage.setItem(STORAGE_KEY, JSON.stringify(normalized))
        }
        return normalized
      }
    }
    storage?.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_REMINDER_TEMPLATES))
  } catch {
    // no storage (private window, tests): the defaults below
  }
  return DEFAULT_REMINDER_TEMPLATES
}

export const reminderTime = (template, due) => {
  const { unit, value } = normalizeReminderTemplate(template)
  return new Date(due.getTime() + value * (UNIT_MS[unit] ?? 0))
}

// Whether this phone's person is reminded of a chore:
// - assignedTo set   -> only that person
// - no assignedTo    -> everyone listed in assignees
// - no assignees     -> "Anyone" mode, the whole circle
export const remindsPerson = (chore, userId) => {
  if (!userId || !chore) return false
  if (
    chore.notification === false ||
    !chore.nextDueDate ||
    chore.isActive === false ||
    chore.status === PENDING_APPROVAL
  ) {
    return false
  }
  if (chore.assignedTo > 0) return chore.assignedTo === userId
  if (chore.assignees?.length > 0) {
    return chore.assignees.some(assignee => assignee.userId === userId)
  }
  return true
}

const startOfDay = date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

// The reminder's text in the app's language: the chore's name, and when it is
// (or was) due, relative to the moment the reminder shows.
export const reminderText = ({ at, due, locale, name, t, template }) => {
  const days = Math.round((startOfDay(due) - startOfDay(at)) / UNIT_MS.d)
  const time = due.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
  })
  let when
  if (days === 0) when = t('reminders.today', { time })
  else if (days === 1) when = t('reminders.tomorrow', { time })
  else if (days === -1) when = t('reminders.yesterday', { time })
  else {
    const date = due.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
    })
    when = t('reminders.onDate', { date, time })
  }
  const { value } = normalizeReminderTemplate(template)
  let body
  if (value < 0) body = t('reminders.due', { when })
  else if (value > 0) body = t('reminders.overdue', { when })
  else body = t('reminders.now')
  return { title: name, body }
}

// Every reminder still ahead for this person, soonest first, at most
// MAX_REMINDERS. `idFor(choreId, template)` gives each a stable id, so
// scheduling again replaces rather than duplicates.
export const planReminders = ({
  chores,
  idFor,
  now = new Date(),
  text,
  userId,
}) => {
  const reminders = []
  const seen = new Set()
  for (const chore of chores || []) {
    if (!remindsPerson(chore, userId)) continue
    const due = new Date(chore.nextDueDate)
    if (Number.isNaN(due.getTime())) continue
    for (const raw of chore.notificationMetadata?.templates || []) {
      const template = normalizeReminderTemplate(raw)
      if (!UNIT_MS[template.unit]) continue
      const at = reminderTime(template, due)
      if (at <= now) continue
      const id = idFor(chore.id, template)
      if (seen.has(id)) continue
      seen.add(id)
      reminders.push({
        id,
        ...text({ name: chore.name, template, due, at }),
        allowWhileIdle: true,
        schedule: { at },
        extra: { choreId: chore.id },
      })
    }
  }
  reminders.sort((a, b) => a.schedule.at - b.schedule.at)
  return reminders.slice(0, MAX_REMINDERS)
}
