// Makes the two transparent logo PNGs from the owner's original image.
//
//   logo-tile.png       the rounded tile with its flames, outer background removed
//                       (app icon, launcher icon, favicon)
//   logo-character.png  the character alone (in-app graphics, splash screen)
//
// Run from the repository root after `npm ci` in frontend/:
//   node assets/logo/make-logo.mjs
//
// The tile outline was measured on logo-original.jpg (2000 x 2000): its top face is a
// superellipse-cornered rectangle, and a darker 3D band hangs below it.

import { createRequire } from 'node:module'

const require = createRequire(new URL('../../frontend/package.json', import.meta.url))
const sharp = require('sharp')

const dir = new URL('./', import.meta.url)
const SRC = new URL('logo-original.jpg', dir)

// Tile top face (outer edge of the light rim) and the 3D band below it, in pixels.
const FACE = { left: 165, right: 1835, top: 144, bottom: 1834 }
const RADIUS = 342
const EXPONENT = 2.25
const BAND = 54 // depth of the 3D band under the face
const OUTLINE = 1.5 // keep the thin dark outline just outside the rim
const SUPERSAMPLE = 4

// Signed "inside" test for the face: <= 1 inside the superellipse-cornered rectangle.
const insideFace = (x, y, grow) => {
  const l = FACE.left - grow
  const r = FACE.right + grow
  const t = FACE.top - grow
  const b = FACE.bottom + grow
  if (x < l || x > r || y < t || y > b) return false
  const rad = RADIUS + grow
  const cx = Math.min(Math.max(x, l + rad), r - rad)
  const cy = Math.min(Math.max(y, t + rad), b - rad)
  const dx = Math.abs(x - cx) / rad
  const dy = Math.abs(y - cy) / rad
  return dx ** EXPONENT + dy ** EXPONENT <= 1
}

// The tile is the face swept down by the band depth.
const insideTile = (x, y) => {
  for (let s = 0; s <= BAND; s += 2) {
    if (insideFace(x, y - s, OUTLINE)) return true
  }
  return insideFace(x, y - BAND, OUTLINE)
}

const tileAlpha = (width, height) => {
  const alpha = new Uint8Array(width * height)
  const step = 1 / SUPERSAMPLE
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Only edge pixels need supersampling; test the centre and the four corners first.
      const corners = [
        insideTile(x, y),
        insideTile(x + 1, y),
        insideTile(x, y + 1),
        insideTile(x + 1, y + 1),
      ]
      if (corners.every(Boolean)) {
        alpha[y * width + x] = 255
        continue
      }
      if (!corners.some(Boolean) && !insideTile(x + 0.5, y + 0.5)) continue
      let hits = 0
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          if (insideTile(x + (sx + 0.5) * step, y + (sy + 0.5) * step)) hits++
        }
      }
      alpha[y * width + x] = Math.round((255 * hits) / SUPERSAMPLE ** 2)
    }
  }
  return alpha
}

// How strongly a pixel reads as the teal backdrop: 1 = clearly teal, 0 = clearly not.
const tealness = (r, g, b) => {
  const lift = Math.min(g, b) - r // teal has green and blue well above red
  const balance = Math.abs(g - b) // and green close to blue (herbs are green, not teal)
  const fromLift = (lift - 45) / 30
  const fromBalance = (60 - balance) / 25
  return Math.max(0, Math.min(1, fromLift, fromBalance))
}

const characterAlpha = (data, width, height, channels, tile) => {
  const n = width * height
  const solid = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const p = i * channels
    solid[i] = tile[i] === 255 && tealness(data[p], data[p + 1], data[p + 2]) < 0.5 ? 1 : 0
  }
  // Keep the largest connected shape: the character with its hat and head flames.
  // Floating peppers, sparks and the corner flames are separate shapes and drop out.
  const label = new Int32Array(n).fill(-1)
  let best = -1
  let bestSize = 0
  const queue = new Int32Array(n)
  for (let start = 0; start < n; start++) {
    if (!solid[start] || label[start] !== -1) continue
    let head = 0
    let tail = 0
    queue[tail++] = start
    label[start] = start
    while (head < tail) {
      const i = queue[head++]
      const x = i % width
      const neighbours = [
        x > 0 ? i - 1 : -1,
        x < width - 1 ? i + 1 : -1,
        i - width,
        i + width,
      ]
      for (const j of neighbours) {
        if (j >= 0 && j < n && solid[j] && label[j] === -1) {
          label[j] = start
          queue[tail++] = j
        }
      }
    }
    if (tail > bestSize) {
      bestSize = tail
      best = start
    }
  }
  // Soft edge: pixels next to the shape fade with how teal they look.
  const alpha = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    if (label[i] === best) alpha[i] = 255
  }
  const soft = new Uint8Array(alpha)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      if (alpha[i]) continue
      if (!(alpha[i - 1] || alpha[i + 1] || alpha[i - width] || alpha[i + width])) continue
      const p = i * channels
      soft[i] = Math.round(255 * (1 - tealness(data[p], data[p + 1], data[p + 2])))
    }
  }
  return soft
}

const writeCropped = async (rgb, alpha, width, height, file) => {
  const rgba = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = rgb[i * 3]
    rgba[i * 4 + 1] = rgb[i * 3 + 1]
    rgba[i * 4 + 2] = rgb[i * 3 + 2]
    rgba[i * 4 + 3] = alpha[i]
  }
  // Crop to the visible shape, then centre it on a square transparent canvas.
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!alpha[y * width + x]) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  const trimmed = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .png()
    .toBuffer({ resolveWithObject: true })
  const side = Math.max(trimmed.info.width, trimmed.info.height)
  const left = Math.floor((side - trimmed.info.width) / 2)
  const top = Math.floor((side - trimmed.info.height) / 2)
  await sharp(trimmed.data)
    .extend({
      top,
      bottom: side - trimmed.info.height - top,
      left,
      right: side - trimmed.info.width - left,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(new URL(file, dir).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
  console.log(`${file}: ${side} x ${side}`)
}

const { data, info } = await sharp(SRC.pathname.replace(/^\/([A-Za-z]:)/, '$1'))
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
const { width, height, channels } = info
const tile = tileAlpha(width, height)
await writeCropped(data, tile, width, height, 'logo-tile.png')
const character = characterAlpha(data, width, height, channels, tile)
await writeCropped(data, character, width, height, 'logo-character.png')
