import assert from 'node:assert/strict'
import test from 'node:test'

import { hasChoreContent } from '../src/utils/ChoreContent.js'

test('empty "Done means" texts count as none', () => {
  assert.equal(hasChoreContent(undefined), false)
  assert.equal(hasChoreContent(null), false)
  assert.equal(hasChoreContent(''), false)
  assert.equal(hasChoreContent('<p></p>'), false)
  assert.equal(hasChoreContent('<p>&nbsp; </p>'), false)
})

test('words or a picture count as a "Done means" text', () => {
  assert.equal(hasChoreContent('<p>Bed made</p>'), true)
  assert.equal(hasChoreContent('<p>السرير مرتب</p>'), true)
  assert.equal(
    hasChoreContent('<p><img src="x.jpg" dt-data-path="users/1/x.jpg"></p>'),
    true,
  )
})
