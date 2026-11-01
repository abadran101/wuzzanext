import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { URL } from 'node:url'

import {
  DEFAULT_REMINDER_TEMPLATES,
  defaultReminderTemplates,
  MAX_REMINDERS,
  normalizeReminderTemplate,
  planReminders,
  reminderText,
  remindsPerson,
} from '../src/utils/ReminderPlan.js'

const read = path =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

// Made-up household: Kim is 2, Sam is 1.
const KIM = 2
const now = new Date(2026, 10, 2, 8, 0)
const at = (day, hour, minute = 0) => new Date(2026, 10, day, hour, minute)
const chore = fields => ({
  id: 7,
  name: 'Water plants',
  nextDueDate: at(3, 18).toISOString(),
  assignedTo: KIM,
  notification: true,
  notificationMetadata: { templates: DEFAULT_REMINDER_TEMPLATES },
  ...fields,
})
// A stand-in for i18next: the key and its values, so the tests read plainly.
const t = (key, values = {}) =>
  `${key}(${Object.entries(values)
    .map(([k, v]) => `${k}=${v}`)
    .join(',')})`
const plan = (chores, userId = KIM) =>
  planReminders({
    chores,
    userId,
    now,
    idFor: (id, template) => `${id}:${template.value}${template.unit}`,
    text: fields => reminderText({ t, locale: 'en-GB', ...fields }),
  })

test('a chore reminds one day before, at the due time and one day after', () => {
  const reminders = plan([chore()])
  assert.deepEqual(
    reminders.map(r => r.schedule.at.getTime()),
    [at(2, 18), at(3, 18), at(4, 18)].map(d => d.getTime()),
  )
  assert.deepEqual(
    reminders.map(r => r.id),
    ['7:-1d', '7:0m', '7:1d'],
  )
  assert.equal(reminders[0].title, 'Water plants')
  assert.deepEqual(reminders[0].extra, { choreId: 7 })
  assert.equal(reminders[0].allowWhileIdle, true)
})

test('only reminders still ahead are scheduled', () => {
  const dueSoon = chore({ nextDueDate: at(2, 9).toISOString() })
  assert.deepEqual(
    plan([dueSoon]).map(r => r.id),
    ['7:0m', '7:1d'],
  )
})

test('only the signed-in person is reminded', () => {
  assert.equal(remindsPerson(chore(), KIM), true)
  assert.equal(remindsPerson(chore({ assignedTo: 1 }), KIM), false)
  assert.equal(remindsPerson(chore(), null), false, 'nobody signed in')
  const listed = { assignedTo: null, assignees: [{ userId: 1 }, { userId: 2 }] }
  assert.equal(remindsPerson(chore(listed), KIM), true)
  const others = { assignedTo: null, assignees: [{ userId: 1 }] }
  assert.equal(remindsPerson(chore(others), KIM), false)
  assert.equal(
    remindsPerson(chore({ assignedTo: null, assignees: [] }), KIM),
    true,
    'anyone',
  )
})

test('no reminders when they are off, there is no due date, or it waits for approval', () => {
  for (const fields of [
    { notification: false },
    { nextDueDate: null },
    { isActive: false },
    { status: 3 },
    { notificationMetadata: {} },
    { nextDueDate: 'not a date' },
  ])
    assert.deepEqual(plan([chore(fields)]), [], JSON.stringify(fields))
})

test('older reminder shapes still offset the right way', () => {
  assert.deepEqual(
    normalizeReminderTemplate({ value: 2, unit: 'hours', type: 'before' }),
    { value: -2, unit: 'h' },
  )
  assert.deepEqual(
    normalizeReminderTemplate({ value: 5, unit: 'days', type: 'ondue' }),
    { value: 0, unit: 'd' },
  )
  const old = chore({
    notificationMetadata: {
      templates: [
        { value: 2, unit: 'hours', type: 'before' },
        { value: -2, unit: 'h' },
      ],
    },
  })
  const reminders = plan([old])
  assert.equal(reminders.length, 1, 'the same reminder twice is scheduled once')
  assert.equal(reminders[0].schedule.at.getTime(), at(3, 16).getTime())
})

test('soonest first, at most what Android keeps', () => {
  const many = Array.from({ length: 30 }, (_, i) =>
    chore({ id: i + 1, nextDueDate: at(3 + (i % 5), 18).toISOString() }),
  )
  const reminders = plan(many)
  assert.equal(reminders.length, MAX_REMINDERS)
  for (let i = 1; i < reminders.length; i++)
    assert.ok(reminders[i - 1].schedule.at <= reminders[i].schedule.at)
})

test('the text says when the chore is due, relative to the reminder', () => {
  const text = (template, due, when) =>
    reminderText({
      t,
      locale: 'en-GB',
      name: 'Feed fish',
      template,
      due,
      at: when,
    }).body
  const due = at(3, 18)
  assert.equal(
    text({ value: -1, unit: 'd' }, due, at(2, 18)),
    'reminders.due(when=reminders.tomorrow(time=18:00))',
  )
  assert.equal(
    text({ value: -2, unit: 'h' }, due, at(3, 16)),
    'reminders.due(when=reminders.today(time=18:00))',
  )
  assert.equal(text({ value: 0, unit: 'm' }, due, due), 'reminders.now()')
  assert.equal(
    text({ value: 1, unit: 'd' }, due, at(4, 18)),
    'reminders.overdue(when=reminders.yesterday(time=18:00))',
  )
  assert.match(
    text({ value: -3, unit: 'd' }, due, at(0 + 31, 18)),
    /^reminders\.due\(when=reminders\.onDate\(date=3 Nov,time=18:00\)\)$/,
  )
})

test('a new chore starts with the last reminders chosen on this device', () => {
  const store = new Map()
  const storage = {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  }
  assert.deepEqual(
    defaultReminderTemplates(storage),
    DEFAULT_REMINDER_TEMPLATES,
  )
  store.set('defaultNotificationTemplate', '[]')
  assert.deepEqual(defaultReminderTemplates(storage), [], 'none, on purpose')
  store.set(
    'defaultNotificationTemplate',
    '[{"value":1,"unit":"days","type":"before"}]',
  )
  assert.deepEqual(defaultReminderTemplates(storage), [
    { value: -1, unit: 'd' },
  ])
  assert.deepEqual(defaultReminderTemplates(null), DEFAULT_REMINDER_TEMPLATES)
})

test('reminders are scheduled app-wide, follow sign-out and the Settings switch', () => {
  const app = read('src/App.jsx')
  assert.match(app, /useChoreReminders\(\)/)
  assert.doesNotMatch(
    read('src/views/Chores/MyChores.jsx'),
    /scheduleChoreNotification|LocalNotificationScheduler/,
  )
  const hook = read('src/hooks/useChoreReminders.js')
  assert.match(
    hook,
    /if \(!isAuthenticated\) \{\s+await cancelChoreReminders\(\)/,
  )
  const settings = read('src/views/Settings/NotificationSetting.jsx')
  assert.match(
    settings,
    /setNotificationPreferences\(\{ granted: false \}\)\s+\}/,
  )
  assert.match(settings, /REMINDERS_CHANGED_EVENT/)
  assert.match(
    read('src/views/ChoreEdit/ChoreEdit.jsx'),
    /choreId \? \{\} : \{ templates: defaultReminderTemplates\(\) \}/,
  )
})

test('the reminder texts read in English and Arabic', () => {
  const en = JSON.parse(read('public/locales/en/common.json')).reminders
  const ar = JSON.parse(read('public/locales/ar/common.json')).reminders
  assert.deepEqual(Object.keys(ar).sort(), Object.keys(en).sort())
  assert.equal(
    en.due.replace('{{when}}', en.tomorrow.replace('{{time}}', '6:00 PM')),
    'Due tomorrow at 6:00 PM',
  )
  for (const key of ['today', 'tomorrow', 'yesterday', 'onDate'])
    assert.match(ar[key], /\{\{time\}\}/, key)
  for (const key of ['due', 'overdue'])
    assert.match(ar[key], /\{\{when\}\}/, key)
})
