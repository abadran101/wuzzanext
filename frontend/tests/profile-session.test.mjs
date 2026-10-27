import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { URL } from 'node:url'

import {
  canSwitchPerson,
  isIdle,
  lockSeconds,
  PROFILE_COLOURS,
  retryDeadline,
  updatePIN,
} from '../src/utils/ProfileSession.js'

test('PIN accepts only ASCII digits, preserves zero and stops at four', () => {
  let pin = ''
  for (const key of ['0', 'x', '١', '1', '2', '3', '4'])
    pin = updatePIN(pin, key)
  assert.equal(pin, '0123')
  assert.equal(updatePIN(pin, 'delete'), '012')
  assert.equal(updatePIN('', 'delete'), '')
  assert.equal(updatePIN('12', '34'), '12')
})

test('Retry-After seconds and HTTP date yield an expiring countdown', () => {
  const now = Date.parse('2026-01-01T00:00:00Z')
  const deadline = retryDeadline('60', now)
  assert.equal(lockSeconds(deadline, now), 60)
  assert.equal(lockSeconds(deadline, now + 59001), 1)
  assert.equal(lockSeconds(deadline, now + 61000), 0)
  assert.equal(retryDeadline('Thu, 01 Jan 2026 00:01:00 GMT', now), deadline)
  assert.equal(retryDeadline(null, now), deadline)
  assert.equal(retryDeadline('0', now), now)
})

test('idle uses wall time including a background interval', () => {
  assert.equal(isIdle(1000, 300999), false)
  assert.equal(isIdle(1000, 301000), true)
  assert.equal(isIdle(1000, 601000), true)
  assert.equal(isIdle(601000, 601001), false)
})

test('empty outbox allows offline switch without syncing', async () => {
  assert.equal(
    await canSwitchPerson({
      getPending: async () => [],
      online: false,
      sync: () => assert.fail('no sync needed'),
    }),
    true,
  )
})

test('offline pending outbox blocks switching and stays intact', async () => {
  const commands = [{ id: 1 }]
  assert.equal(
    await canSwitchPerson({
      getPending: async () => commands,
      online: false,
      sync: () => assert.fail('offline'),
    }),
    false,
  )
  assert.deepEqual(commands, [{ id: 1 }])
})

test('online switch waits for sync and rechecks the outbox', async () => {
  let commands = [{ id: 1 }]
  const guard = {
    getPending: async () => commands,
    online: true,
    sync: async () => false,
  }
  assert.equal(await canSwitchPerson(guard), false)
  guard.sync = async () => {
    commands = []
  }
  assert.equal(await canSwitchPerson(guard), true)
})

test('sync failure blocks switching', async () => {
  assert.equal(
    await canSwitchPerson({
      getPending: async () => [{ id: 1 }],
      online: true,
      sync: async () => {
        throw new Error('offline')
      },
    }),
    false,
  )
})

test('every profile translation is present in English and Arabic', () => {
  const bundle = language =>
    JSON.parse(
      readFileSync(
        new URL(`../public/locales/${language}/profiles.json`, import.meta.url),
        'utf8',
      ),
    )
  const en = bundle('en')
  const ar = bundle('ar')
  assert.deepEqual(Object.keys(en).sort(), Object.keys(ar).sort())
  for (const text of [...Object.values(en), ...Object.values(ar)])
    assert.ok(text.trim())
  for (const file of [
    'components/ProfileColourPicker.jsx',
    'components/ProfileSessionManager.jsx',
    'views/Authorization/FacesPicker.jsx',
    'views/Settings/HouseholdProfileSettings.jsx',
  ]) {
    const source = readFileSync(
      new URL(`../src/${file}`, import.meta.url),
      'utf8',
    )
    for (const match of source.matchAll(/\bt\('([\w]+)'/g)) {
      assert.ok(en[match[1]], `English: ${match[1]}`)
      assert.ok(ar[match[1]], `Arabic: ${match[1]}`)
    }
  }
  for (const key of [
    'wrongPIN',
    'failed',
    'saved',
    'currentPIN',
    'password',
    'switchPerson',
  ]) {
    assert.ok(en[key])
    assert.ok(ar[key])
  }
  assert.equal(PROFILE_COLOURS.length, 8)
})
