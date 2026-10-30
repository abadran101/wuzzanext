// Builds the home-server program (Windows, amd64) with the web interface and the exact
// source of this commit inside it, served as /wuzzanext-source.tar.gz (AGPL; task 020).
//
//   node scripts/build-server.mjs
//
// Needs a clean, committed tree, `npm ci` done in frontend/, and Go. The program lands in
// release/wuzzanext-<short hash>/wuzzanext.exe; backend/frontend/dist is restored afterwards.

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const frontend = path.join(root, 'frontend')
const backend = path.join(root, 'backend')
const embedDir = path.join(backend, 'frontend', 'dist')
const archiveName = 'wuzzanext-source.tar.gz'

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit', ...opts })
const read = (cmd, args) =>
  execFileSync(cmd, args, { cwd: root, encoding: 'utf8' }).trim()
const stop = message => {
  console.error(`STOP: ${message}`)
  process.exit(1)
}
const sha256 = file =>
  createHash('sha256').update(fs.readFileSync(file)).digest('hex')

// The archive must be exactly this commit, and the web files must come from it too.
if (read('git', ['status', '--porcelain']) !== '') {
  stop('the working tree has changes; commit them first')
}
for (const name of ['.env.local', '.env.selfhosted.local']) {
  if (fs.existsSync(path.join(frontend, name))) {
    stop(`frontend/${name} would change the build; move it away first`)
  }
}
const vite = path.join(frontend, 'node_modules', 'vite', 'bin', 'vite.js')
if (!fs.existsSync(vite)) stop('run npm ci in frontend/ first')

const commit = read('git', ['rev-parse', 'HEAD'])
const outDir = path.join(root, 'release', `wuzzanext-${commit.slice(0, 12)}`)
const exe = path.join(outDir, 'wuzzanext.exe')

run(process.execPath, [vite, 'build', '--mode', 'selfhosted'], {
  cwd: frontend,
})

try {
  fs.rmSync(embedDir, { recursive: true, force: true })
  fs.cpSync(path.join(frontend, 'dist'), embedDir, { recursive: true })
  // autocrlf off: the archive holds the committed bytes, whatever this machine's setting.
  run('git', [
    '-c',
    'core.autocrlf=false',
    'archive',
    '--format=tar.gz',
    `--prefix=wuzzanext-${commit}/`,
    '-o',
    path.join(embedDir, archiveName),
    commit,
  ])
  fs.mkdirSync(outDir, { recursive: true })
  run('go', ['build', '-trimpath', '-o', exe, '.'], {
    cwd: backend,
    env: { ...process.env, CGO_ENABLED: '0', GOOS: 'windows', GOARCH: 'amd64' },
  })
  fs.copyFileSync(
    path.join(embedDir, archiveName),
    path.join(outDir, archiveName),
  )
} finally {
  // Put the committed placeholder back so the tree stays clean.
  fs.rmSync(embedDir, { recursive: true, force: true })
  run('git', ['checkout', '--', 'backend/frontend/dist'])
}

const archive = path.join(outDir, archiveName)
const lines = [
  `commit: ${commit}`,
  `program: ${exe}`,
  `  ${fs.statSync(exe).size} bytes, SHA-256 ${sha256(exe)}`,
  `source archive (inside the program, copy beside it): ${archive}`,
  `  ${fs.statSync(archive).size} bytes, SHA-256 ${sha256(archive)}`,
]
console.log(lines.join('\n'))
