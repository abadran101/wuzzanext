import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { URL } from 'node:url'

const read = path =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('the About page links the source archive the server build embeds', () => {
  assert.match(read('src/views/About.jsx'), /\/wuzzanext-source\.tar\.gz/)
  // The service worker must not answer the download with the app shell.
  assert.match(
    read('vite.config.mjs'),
    /\/\^\\\/wuzzanext-source\\\.tar\\\.gz\$\//,
  )

  const build = read('../scripts/build-server.mjs')
  assert.match(build, /'status', '--porcelain'/)
  assert.match(build, /--prefix=wuzzanext-\$\{commit\}\//)
  assert.match(build, /path\.join\(embedDir, archiveName\)/)
  assert.match(build, /'checkout', '--', 'backend\/frontend\/dist'/)
})
