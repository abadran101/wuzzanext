// Makes every app icon and splash screen from the two logo cut-outs.
//
// Run from the repository root after make-logo.mjs and `npm ci` in frontend/:
//   node assets/logo/make-icons.mjs
//
// Sizes and backgrounds follow the files the upstream project already ships, so the web
// manifest, index.html and the Android resources need no other change.

import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(new URL('../../frontend/package.json', import.meta.url))
const sharp = require('sharp')

sharp.cache(false) // splash files are read, then overwritten in place

const here = path.dirname(fileURLToPath(import.meta.url))
const frontend = path.resolve(here, '../../frontend')
const TILE = path.join(here, 'logo-tile.png')
const CHARACTER = path.join(here, 'logo-character.png')

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }
const NIGHT = { r: 17, g: 17, b: 17, alpha: 1 }
const TEAL = { r: 24, g: 169, b: 164, alpha: 1 } // the tile's own inner colour
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 }

// The tile's corners reach about 1.21 x its half-width from the centre, so 74% keeps the
// whole tile inside Android's circular launcher mask.
const IN_CIRCLE = 0.74

// Draws `source` centred on a width x height canvas, scaled to `fraction` of the shorter side.
const render = async (source, width, height, fraction, background) => {
  const side = Math.round(Math.min(width, height) * fraction)
  const art = await sharp(source)
    .resize(side, side, { kernel: 'lanczos3' })
    .png()
    .toBuffer()
  return sharp({ create: { width, height, channels: 4, background } })
    .composite([{ input: art, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
}

const circle = size =>
  Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  )

const write = async (image, file) => {
  const target = path.join(frontend, file)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  await image.toFile(target)
  console.log(file)
}

// An .ico file holding PNG images (supported by every current browser).
const writeIco = async (sizes, file) => {
  const images = await Promise.all(
    sizes.map(size => render(TILE, size, size, 1, CLEAR).then(img => img.toBuffer())),
  )
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach((data, i) => {
    const entry = 6 + 16 * i
    header.writeUInt8(sizes[i] % 256, entry)
    header.writeUInt8(sizes[i] % 256, entry + 1)
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(data.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += data.length
  })
  fs.writeFileSync(path.join(frontend, file), Buffer.concat([header, ...images]))
  console.log(file)
}

// Web: browser tab, home screen and PWA install icons.
for (const size of [16, 32]) {
  await write(await render(TILE, size, size, 1, CLEAR), `public/favicon-${size}x${size}.png`)
}
await writeIco([16, 32, 48], 'public/favicon.ico')
for (const size of [192, 512]) {
  await write(await render(TILE, size, size, 0.92, CLEAR), `public/android-chrome-${size}x${size}.png`)
}
for (const size of [64, 192, 512]) {
  await write(await render(TILE, size, size, 0.92, CLEAR), `public/pwa-${size}x${size}.png`)
}
await write(await render(CHARACTER, 512, 512, 0.62, TEAL), 'public/maskable-icon-512x512.png')
await write(await render(TILE, 270, 270, 0.92, CLEAR), 'public/mstile-150x150.png')
// iOS shows transparency as black, so the touch icons sit on white.
for (const file of ['public/apple-touch-icon.png', 'public/apple-touch-icon-180x180.png']) {
  await write(await render(TILE, 180, 180, 0.9, WHITE), file)
}

// In-app logo.
await write(await render(CHARACTER, 512, 512, 1, CLEAR), 'src/assets/logo.png')

// Sources for Capacitor's asset tools.
await write(await render(TILE, 1024, 1024, 0.92, CLEAR), 'resources/icon.png')
await write(await render(CHARACTER, 1024, 1024, 0.7, CLEAR), 'resources/splash.png')
await write(await render(CHARACTER, 1024, 1024, 0.7, CLEAR), 'resources/splash-dark.png')

// Android launcher icons and splash screens, at the sizes already in the project.
const res = 'android/app/src/main/res'
const launcher = { ldpi: 36, mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }
for (const [density, size] of Object.entries(launcher)) {
  const dir = `${res}/mipmap-${density}`
  const layer = Math.round(size * 2.25) // adaptive layers are 108dp for a 48dp icon
  await write(await render(TILE, size, size, 0.92, CLEAR), `${dir}/ic_launcher.png`)
  const round = await render(TILE, size, size, IN_CIRCLE, CLEAR)
  await write(
    sharp(circle(size)).composite([{ input: await round.toBuffer() }]).png({ compressionLevel: 9 }),
    `${dir}/ic_launcher_round.png`,
  )
  await write(await render(TILE, layer, layer, IN_CIRCLE, CLEAR), `${dir}/ic_launcher_foreground.png`)
  await write(
    sharp({ create: { width: layer, height: layer, channels: 4, background: WHITE } }).png(),
    `${dir}/ic_launcher_background.png`,
  )
}

const splashDirs = fs
  .readdirSync(path.join(frontend, res))
  .filter(dir => dir.startsWith('drawable') && fs.existsSync(path.join(frontend, res, dir, 'splash.png')))
for (const dir of splashDirs) {
  const file = `${res}/${dir}/splash.png`
  const { width, height } = await sharp(path.join(frontend, file)).metadata()
  const background = dir.includes('night') ? NIGHT : WHITE
  await write(await render(CHARACTER, width, height, 0.45, background), file)
}
