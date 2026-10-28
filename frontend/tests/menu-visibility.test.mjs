import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { URL } from 'node:url'

import {
  isMenuItemVisible,
  MENU_ITEM_NAMES,
} from '../src/utils/MenuVisibility.js'

test('admins see all optional items regardless of the household setting', () => {
  for (const item of MENU_ITEM_NAMES) {
    assert.equal(
      isMenuItemVisible(item, { isAdmin: true, memberItems: [] }),
      true,
    )
  }
})

test('regular members only see selected optional items', () => {
  for (const item of MENU_ITEM_NAMES) {
    assert.equal(isMenuItemVisible(item, { isAdmin: false }), false)
    assert.equal(isMenuItemVisible(item, { memberItems: [item] }), true)
    assert.equal(isMenuItemVisible(item, { memberItems: ['unknown'] }), false)
  }
})

test('loading defaults hide optional items and keep ordinary navigation', () => {
  for (const item of MENU_ITEM_NAMES)
    assert.equal(isMenuItemVisible(item), false)
  for (const item of ['home', 'tasks', 'projects', 'settings', undefined]) {
    assert.equal(isMenuItemVisible(item), true)
  }
})

test('menu texts exist in English and Arabic', () => {
  for (const language of ['en', 'ar']) {
    const load = namespace =>
      JSON.parse(
        readFileSync(
          new URL(
            `../public/locales/${language}/${namespace}.json`,
            import.meta.url,
          ),
          'utf8',
        ),
      )
    assert.ok(load('profiles').memberMenu)
    for (const key of ['archived', 'things', 'labels', 'reportBug']) {
      assert.ok(load('common').navigation[key], `${language}: ${key}`)
    }
  }
})
