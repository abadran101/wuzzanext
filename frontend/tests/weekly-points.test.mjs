import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_CHORE_POINTS,
  DEFAULT_WEEK_START,
  earnedAt,
  isInWeek,
  startOfWeek,
  weekDays,
} from '../src/utils/WeeklyPoints.js'

// Local times; 2026-10-29 is a Thursday.
const thursday = new Date(2026, 9, 29, 15, 30)
const at = (day, hour = 12) => new Date(2026, 9, day, hour).toISOString()
const done = (performedAt, extra = {}) => ({ status: 1, performedAt, ...extra })

test('new chores are worth 1 star and the week starts on Monday', () => {
  assert.equal(DEFAULT_CHORE_POINTS, 1)
  assert.equal(DEFAULT_WEEK_START, 1)
})

test('the week starts at midnight on its first day', () => {
  assert.deepEqual(startOfWeek(thursday), new Date(2026, 9, 26))
  assert.deepEqual(startOfWeek(thursday, 0), new Date(2026, 9, 25))
  assert.deepEqual(startOfWeek(thursday, 6), new Date(2026, 9, 24))
  assert.deepEqual(startOfWeek(thursday, 4), new Date(2026, 9, 29))
  // Monday itself, and the last minute of Sunday
  assert.deepEqual(
    startOfWeek(new Date(2026, 9, 26, 0, 0)),
    new Date(2026, 9, 26),
  )
  assert.deepEqual(
    startOfWeek(new Date(2026, 10, 1, 23, 59)),
    new Date(2026, 9, 26),
  )
})

test('the week has seven days, first day first', () => {
  const days = weekDays(thursday)
  assert.equal(days.length, 7)
  assert.equal(days[0].getDay(), 1)
  assert.equal(days[6].getDay(), 0)
  assert.deepEqual(days[6], new Date(2026, 10, 1))
})

test('only this week’s finished chores count, from zero on Monday', () => {
  assert.equal(isInWeek(done(at(26, 0)), thursday), true)
  assert.equal(isInWeek(done(at(29)), thursday), true)
  assert.equal(isInWeek(done(at(25, 23)), thursday), false, 'last Sunday')
  assert.equal(isInWeek(done(at(25, 23)), thursday, 0), true, 'a Sunday week')
  assert.equal(
    isInWeek(done(new Date(2026, 10, 2).toISOString()), thursday),
    false,
  )
  for (const status of [0, 2, 3, 4])
    assert.equal(
      isInWeek({ status, performedAt: at(28) }, thursday),
      false,
      `status ${status}`,
    )
  assert.equal(isInWeek({ status: 1 }, thursday), false)
})

test('an approved chore counts in the week it was approved', () => {
  const lateSunday = done(at(25, 22), { approvedAt: at(27, 8) })
  assert.equal(earnedAt(lateSunday), at(27, 8))
  assert.equal(isInWeek(lateSunday, thursday), true)
  const approvedLastWeek = done(at(29), { approvedAt: at(25) })
  assert.equal(isInWeek(approvedLastWeek, thursday), false)
})
