import assert from 'node:assert/strict'
import test from 'node:test'

import {
  asksForThumbsUpByDefault,
  withDonePhoto,
} from '../src/utils/ChoreApproval.js'

test('a chore given to someone else asks for a thumbs up', () => {
  assert.equal(asksForThumbsUpByDefault([2], 1), true)
  assert.equal(asksForThumbsUpByDefault([1, 2], 1), true)
})

test("one's own chore, or nobody yet, doesn't", () => {
  assert.equal(asksForThumbsUpByDefault([1], 1), false)
  assert.equal(asksForThumbsUpByDefault([1, null], 1), false)
  assert.equal(asksForThumbsUpByDefault([], 1), false)
  assert.equal(asksForThumbsUpByDefault(undefined, 1), false)
})

test('a done photo goes into the note with its storage path', () => {
  const photo =
    '<p><img src="http://h/api/v1/assets/users/3/a.jpg?expires=1&amp;sig=x" dt-data-path="users/3/a.jpg"></p>'
  assert.equal(
    withDonePhoto(
      null,
      'http://h/api/v1/assets/users/3/a.jpg?expires=1&sig=x',
      'users/3/a.jpg',
    ),
    photo,
  )
  assert.equal(
    withDonePhoto(
      '<p><br></p>',
      'http://h/api/v1/assets/users/3/a.jpg?expires=1&sig=x',
      'users/3/a.jpg',
    ),
    photo,
  )
  assert.equal(
    withDonePhoto('<p>Watered</p>', 'x.jpg', 'users/3/x.jpg'),
    '<p>Watered</p><p><img src="x.jpg" dt-data-path="users/3/x.jpg"></p>',
  )
})

test('odd characters in a path cannot break out of the picture tag', () => {
  assert.equal(
    withDonePhoto('', 'a"><script>', 'p"q'),
    '<p><img src="a&quot;&gt;&lt;script&gt;" dt-data-path="p&quot;q"></p>',
  )
})
