import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { URL } from 'node:url'

const read = path =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('the app has no home-server address built in', () => {
  const env = read('.env.android')
  assert.match(env, /^VITE_APP_API_URL=\s*$/m)
  assert.match(env, /^VITE_IS_SELF_HOSTED=true\s*$/m)
  assert.match(
    JSON.parse(read('package.json')).scripts.android,
    /vite build --mode android/,
  )
})

test('a release without the owner’s keystore comes out unsigned', () => {
  const gradle = read('android/app/build.gradle')
  assert.match(
    gradle,
    /signingConfig keystorePropertiesFile\.exists\(\) \? signingConfigs\.release : null/,
  )
  assert.doesNotMatch(gradle, /signingConfigs\.debug/)
})

test('no cloud push and no Google/Apple sign-in in the app', () => {
  assert.match(read('src/Config.js'), /CLOUD_PUSH_ENABLED = false/)
  const listener = read('src/CapacitorListener.js')
  assert.match(listener, /if \(!CLOUD_PUSH_ENABLED\) return/)
  assert.match(
    read('src/views/Authorization/LoginView.jsx'),
    /VITE_IS_SELF_HOSTED !== 'true' &&\s+!Capacitor\.isNativePlatform\(\)/,
  )
})
