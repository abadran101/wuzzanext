import assert from 'node:assert/strict'
import test from 'node:test'

import {
  choreNeedsTranslation,
  chunk,
  textNeedsTranslation,
  translatedChoreText,
  translationTarget,
} from '../src/utils/TranslationText.js'

test('only English and Arabic are translation targets', () => {
  assert.equal(translationTarget('ar'), 'ar')
  assert.equal(translationTarget('ar-EG'), 'ar')
  assert.equal(translationTarget('en-US'), 'en')
  assert.equal(translationTarget('fr'), null)
  assert.equal(translationTarget(undefined), null)
})

test('English readers with English chores send nothing', () => {
  assert.equal(textNeedsTranslation('Water the plants', 'en'), false)
  assert.equal(
    choreNeedsTranslation(
      { name: 'Water the plants', description: '<p>Blue can</p>' },
      'en',
    ),
    false,
  )
})

test('Arabic readers ask for English chores, not Arabic ones', () => {
  assert.equal(textNeedsTranslation('Water the plants', 'ar'), true)
  assert.equal(textNeedsTranslation('اسقِ النباتات', 'ar'), false)
  assert.equal(textNeedsTranslation('اسقِ النباتات', 'en'), true)
})

test('markup, numbers and empty text are not sent', () => {
  assert.equal(textNeedsTranslation('<p></p>', 'ar'), false)
  assert.equal(textNeedsTranslation('<p>&nbsp;123</p>', 'ar'), false)
  assert.equal(textNeedsTranslation('', 'ar'), false)
  assert.equal(textNeedsTranslation(null, 'en'), false)
  assert.equal(
    choreNeedsTranslation({ name: '🧹', description: null }, 'ar'),
    false,
  )
})

test('a chore is asked for when its details need it', () => {
  assert.equal(
    choreNeedsTranslation(
      { name: 'اسقِ النباتات', description: '<p>Use the blue can</p>' },
      'ar',
    ),
    true,
  )
})

test('untranslated fields keep the original text', () => {
  const chore = { name: 'Sweep', description: '<p>Kitchen</p>' }
  assert.deepEqual(translatedChoreText(chore, null), {
    ...chore,
    translated: false,
  })
  assert.deepEqual(
    translatedChoreText(chore, {
      name: { status: 'translated', text: 'اكنس' },
      description: { status: 'limit' },
    }),
    { name: 'اكنس', description: '<p>Kitchen</p>', translated: true },
  )
})

test('translated details with other markup are not shown', () => {
  const chore = { name: 'Sweep', description: '<p>Use the <b>blue</b> can</p>' }
  const answer = text => ({
    name: { status: 'unchanged' },
    description: { status: 'translated', text },
  })
  assert.equal(
    translatedChoreText(chore, answer('<p>استخدم العلبة <b>الزرقاء</b></p>'))
      .description,
    '<p>استخدم العلبة <b>الزرقاء</b></p>',
  )
  assert.deepEqual(
    translatedChoreText(
      chore,
      answer('<p>استخدم <img src=x onerror=alert(1)> <b>الزرقاء</b></p>'),
    ),
    { ...chore, translated: false },
  )
})

test('requests are split into the server limit', () => {
  const ids = Array.from({ length: 205 }, (_, i) => i + 1)
  assert.deepEqual(
    chunk(ids).map(part => part.length),
    [100, 100, 5],
  )
})
