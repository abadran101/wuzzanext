import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { URL } from 'node:url'

const locales = new URL('../public/locales/', import.meta.url)
const pluralSuffix = /_(zero|one|two|few|many|other)$/
const pluralForms = ['zero', 'one', 'two', 'few', 'many', 'other']

function flatten(object, prefix = '', entries = {}) {
  for (const [key, value] of Object.entries(object)) {
    const path = `${prefix}${key}`
    if (value !== null && typeof value === 'object') {
      flatten(value, `${path}.`, entries)
    } else {
      entries[path] = value
    }
  }
  return entries
}

function placeholders(value) {
  return [
    ...new Set([...value.matchAll(/{{(.*?)}}/g)].map(match => match[1])),
  ].sort()
}

for (const namespace of readdirSync(new URL('en/', locales)).filter(name =>
  name.endsWith('.json'),
)) {
  test(`Arabic locale parity: ${namespace}`, () => {
    const english = flatten(
      JSON.parse(readFileSync(new URL(`en/${namespace}`, locales), 'utf8')),
    )
    // Reading also asserts that the Arabic namespace exists and its JSON parses.
    const arabic = flatten(
      JSON.parse(readFileSync(new URL(`ar/${namespace}`, locales), 'utf8')),
    )

    for (const key of Object.keys(english)) {
      const arabicKey = pluralSuffix.test(key)
        ? key.replace(pluralSuffix, '_other')
        : key
      assert.ok(
        Object.hasOwn(arabic, arabicKey),
        `${namespace}: missing ${arabicKey}`,
      )
      if (/_(one|other)$/.test(key)) {
        const family = key.replace(pluralSuffix, '')
        for (const form of pluralForms) {
          assert.ok(
            Object.hasOwn(arabic, `${family}_${form}`),
            `${namespace}: missing ${family}_${form}`,
          )
        }
      }
    }

    for (const [key, value] of Object.entries(arabic)) {
      assert.equal(typeof value, 'string', `${namespace}: ${key} must be text`)
      assert.ok(value.trim(), `${namespace}: empty ${key}`)
      const englishKey = pluralSuffix.test(key)
        ? key.replace(pluralSuffix, '_other')
        : key
      // Retain legacy Arabic entries whose English source has been removed.
      // They still must be nonempty; compare placeholders wherever a source exists.
      if (Object.hasOwn(english, englishKey)) {
        assert.deepEqual(
          placeholders(value),
          placeholders(english[englishKey]),
          `${namespace}: placeholders in ${key}`,
        )
      }
    }
  })
}
