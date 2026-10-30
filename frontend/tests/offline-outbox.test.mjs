import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { URL } from 'node:url'

import {
  belongsTo,
  outboxOwnerFromToken,
  replacedNames,
  replayOutcome,
  withChangeTime,
} from '../src/utils/OutboxRules.js'

const read = path =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

// A made-up session token: only the claims part matters here.
const tokenFor = claims =>
  [
    'eyJhbGciOiJIUzI1NiJ9',
    Buffer.from(JSON.stringify(claims)).toString('base64url'),
    'made-up-signature',
  ].join('.')

test('the outbox owner is the username in the session token', () => {
  assert.equal(outboxOwnerFromToken(tokenFor({ id: 'sam' })), 'sam')
  assert.equal(outboxOwnerFromToken(tokenFor({ id: 'سارة' })), 'سارة')
  assert.equal(outboxOwnerFromToken(tokenFor({ id: 7 })), '7')
  for (const bad of [null, '', 'not-a-token', 'a.%%%.c', tokenFor({})])
    assert.equal(outboxOwnerFromToken(bad), null)
})

test("each person's outbox holds only their own commands", () => {
  const sam = { owner: 'sam' }
  const kim = { owner: 'kim' }
  const older = { owner: null }
  assert.equal(belongsTo(sam, 'sam'), true)
  assert.equal(belongsTo(kim, 'sam'), false)
  assert.equal(belongsTo(sam, null), false, 'nobody signed in sends nothing')
  assert.equal(belongsTo(older, 'sam'), true, 'commands from before 017')
  assert.equal(belongsTo({}, 'kim'), true)
})

test('replay sends the time the change was made on the phone', () => {
  const at = Date.parse('2026-10-30T08:15:00.250Z')
  assert.equal(
    withChangeTime('/chores/4/skip', at),
    '/chores/4/skip?changedAt=2026-10-30T08%3A15%3A00.250Z',
  )
  assert.equal(
    withChangeTime('/chores/4/do?completedDate=x', at),
    '/chores/4/do?completedDate=x&changedAt=2026-10-30T08%3A15%3A00.250Z',
  )
  assert.equal(withChangeTime('/chores/', undefined), '/chores/')
  assert.equal(withChangeTime('/chores/', 'not a time'), '/chores/')
})

test('a change that lost is dropped with a note; a completion never is', () => {
  for (const type of [
    'update_chore',
    'reschedule_chore',
    'skip_chore',
    'start_chore',
    'pause_chore',
    'archive_chore',
    'unarchive_chore',
    'delete_chore',
  ])
    assert.equal(replayOutcome(type, 409), 'replaced', type)
  assert.equal(replayOutcome('complete_chore', 409), 'failed')
  assert.equal(replayOutcome('create_chore', 409), 'failed')

  // The chore was deleted since: the delete was the newer change.
  assert.equal(replayOutcome('update_chore', 404), 'replaced')
  assert.equal(replayOutcome('delete_chore', 404), 'done')
  assert.equal(replayOutcome('complete_chore', 404), 'done')

  assert.equal(replayOutcome('update_chore', 400), 'failed')
  for (const status of [401, 408, 429, 500, 503, undefined])
    assert.equal(replayOutcome('update_chore', status), 'retry', `${status}`)
})

test('the note names each chore once', () => {
  assert.deepEqual(
    replacedNames(['Water plants', null, 'Feed fish', 'Water plants', ' ']),
    ['Water plants', 'Feed fish'],
  )
})

test('every replayed change carries its time, and nothing clears the outbox on sign-in or a forced sign-out', () => {
  // Whitespace and trailing commas as prettier lays them out.
  const engine = read('src/utils/SyncEngine.js')
    .replace(/\s+/g, ' ')
    .replace(/\( /g, '(')
    .replace(/,? \)/g, ')')
  for (const call of [
    'SaveChore(cmd.payload, changedAt)',
    'SkipChore(cmd.payload.id || cmd.entityId, changedAt)',
    'StartChore(cmd.payload.id || cmd.entityId, changedAt)',
    'PauseChore(cmd.payload.id || cmd.entityId, changedAt)',
    'DeleteChore(cmd.payload.id || cmd.entityId, changedAt)',
    'ArchiveChore(cmd.payload.id || cmd.entityId, changedAt)',
    'UnArchiveChore(cmd.payload.id || cmd.entityId, changedAt)',
    'UpdateDueDate(id, dueDate, changedAt)',
  ])
    assert.ok(engine.includes(call), call)
  assert.ok(engine.includes('performer || null, changedAt)'))

  assert.doesNotMatch(read('src/utils/ApiClient.js'), /offlineDB\.clearAll\(/)
  assert.doesNotMatch(read('src/hooks/useAuth.jsx'), /offlineDB\.clearAll\(/)
  const session = read('src/components/ProfileSessionManager.jsx')
  assert.doesNotMatch(session, /offlineDB\.getCommands\(/)
  assert.match(
    read('src/utils/CommandQueue.js'),
    /owner: currentOutboxOwner\(\)/,
  )
})

test('the replaced note reads in English and Arabic', () => {
  const en = JSON.parse(read('public/locales/en/common.json')).sync
  const ar = JSON.parse(read('public/locales/ar/common.json')).sync
  assert.equal(
    en.replaced_one.replace('{{count}}', 1).replace('{{names}}', 'Feed fish'),
    '1 change was replaced by a newer one: Feed fish',
  )
  for (const form of ['zero', 'one', 'two', 'few', 'many', 'other'])
    assert.match(ar[`replaced_${form}`], /\{\{names\}\}/)
})
