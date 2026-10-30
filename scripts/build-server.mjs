// Builds the home-server package: the program (Windows, amd64) with the web interface and
// the exact source of this commit inside it, served as /wuzzanext-source.tar.gz (AGPL; task
// 020), plus the config template, the deployment spec and the owner's steps (task 019).
//
//   node scripts/build-server.mjs
//
// Needs a clean, committed tree, `npm ci` done in frontend/, and Go. The package lands in
// release/wuzzanext-<short hash>/ with a SHA256SUMS.txt; backend/frontend/dist is restored
// afterwards.

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
// The commit's own time, so two builds of one commit stay alike.
const builtAt = read('git', ['show', '-s', '--format=%cI', commit])
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
  // Stamp the commit: /health and the About page show what is running.
  const stamp = [
    `-X donetick.com/core/config.Commit=${commit}`,
    `-X donetick.com/core/config.BuildDate=${builtAt}`,
  ].join(' ')
  run('go', ['build', '-trimpath', '-ldflags', stamp, '-o', exe, '.'], {
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

// The rest of the home-server package (task 019): the config template, the deployment
// spec and the owner's steps, with a SHA-256 list the owner checks on the host.
const packaged = {
  'selfhosted.yaml.template': path.join(root, 'deploy', 'selfhosted.yaml'),
  'deployment-spec.md': path.join(root, 'docs', 'deployment-spec.md'),
  'owner-guide.md': path.join(root, 'docs', 'owner-guide.md'),
}
for (const [name, from] of Object.entries(packaged)) {
  fs.copyFileSync(from, path.join(outDir, name))
}
const names = ['wuzzanext.exe', archiveName, ...Object.keys(packaged)]
const sums = names.map(name => `${sha256(path.join(outDir, name))}  ${name}`)
fs.writeFileSync(
  path.join(outDir, 'SHA256SUMS.txt'),
  sums.join('\r\n') + '\r\n',
)

const lines = [`commit: ${commit}`, `package: ${outDir}`]
for (const name of names) {
  lines.push(`  ${name}: ${fs.statSync(path.join(outDir, name)).size} bytes`)
}
lines.push('SHA256SUMS.txt:', ...sums.map(line => `  ${line}`))
console.log(lines.join('\n'))
