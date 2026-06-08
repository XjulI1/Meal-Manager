// Génère les icônes PWA (PNG) sans dépendance externe.
//
// Pourquoi un script maison plutôt que @vite-pwa/assets-generator ?
// L'environnement n'a ni sharp, ni imagemagick, ni rsvg. Ce générateur
// encode des PNG RGBA en pur Node (zlib + CRC32) et dessine l'icône
// (fond vert dégradé + fourchette/couteau blancs) avec supersampling 4x
// pour des bords lisses. Rejouable via `node scripts/generate-pwa-icons.mjs`.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = join(here, '..', 'public')
mkdirSync(publicDir, { recursive: true })

// --- CRC32 / PNG encoder -------------------------------------------------
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  // 10,11,12 = compression/filter/interlace = 0
  // raw scanlines, filter byte 0 prefix per row
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// --- Dessin (supersampling 4x) ------------------------------------------
const SS = 4

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t)
}

// Distance d'un point au rectangle [x0,y0,x1,y1] (0 si dedans) — sert au
// rendu des coins arrondis (signed distance field simplifié).
function roundedRectInside(px, py, x0, y0, x1, y1, r) {
  const cx = Math.min(Math.max(px, x0 + r), x1 - r)
  const cy = Math.min(Math.max(py, y0 + r), y1 - r)
  const dx = px - cx
  const dy = py - cy
  if (px >= x0 + r && px <= x1 - r) return py >= y0 && py <= y1
  if (py >= y0 + r && py <= y1 - r) return px >= x0 && px <= x1
  return dx * dx + dy * dy <= r * r
}

function drawIcon(size, { padding }) {
  const S = size * SS
  const buf = Buffer.alloc(S * S * 4)
  const pad = padding * S // safe-zone padding (fraction of canvas)
  const x0 = pad
  const y0 = pad
  const x1 = S - pad
  const y1 = S - pad
  // padding 0 = icône pleine (maskable / apple-touch) → pas de coins arrondis,
  // l'OS applique son propre masque.
  const bgRadius = pad === 0 ? 0 : (x1 - x0) * 0.22

  // palette
  const top = [0x22, 0xc5, 0x5e] // green-500
  const bottom = [0x15, 0x80, 0x3d] // green-700
  const white = [0xff, 0xff, 0xff]

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4
      const inBg = roundedRectInside(x, y, x0, y0, x1, y1, bgRadius)
      if (!inBg) {
        buf[i] = buf[i + 1] = buf[i + 2] = buf[i + 3] = 0
        continue
      }
      // fond dégradé vertical
      const t = (y - y0) / (y1 - y0)
      let r = lerp(top[0], bottom[0], t)
      let g = lerp(top[1], bottom[1], t)
      let b = lerp(top[2], bottom[2], t)

      // coordonnées utensiles relatives à la zone interne
      const u = (x - x0) / (x1 - x0)
      const v = (y - y0) / (y1 - y0)

      let isWhite = false

      // Fourchette (gauche)
      const fx = 0.38
      const tineW = 0.028
      const tineTop = 0.18
      const tineBottom = 0.38
      for (const off of [-0.07, 0, 0.07]) {
        if (
          Math.abs(u - (fx + off)) <= tineW / 2 &&
          v >= tineTop &&
          v <= tineBottom
        ) {
          isWhite = true
        }
      }
      // tête de la fourchette
      if (Math.abs(u - fx) <= 0.085 && v >= tineBottom && v <= 0.45) isWhite = true
      // manche fourchette
      if (Math.abs(u - fx) <= 0.03 && v >= 0.45 && v <= 0.82) isWhite = true

      // Couteau (droite) — lame puis manche
      const kx = 0.62
      if (Math.abs(u - kx) <= 0.055 && v >= 0.18 && v <= 0.5) isWhite = true // lame
      if (Math.abs(u - kx) <= 0.03 && v >= 0.5 && v <= 0.82) isWhite = true // manche

      if (isWhite) {
        r = white[0]
        g = white[1]
        b = white[2]
      }

      buf[i] = r
      buf[i + 1] = g
      buf[i + 2] = b
      buf[i + 3] = 255
    }
  }

  // downsample box 4x -> size
  const out = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const j = ((y * SS + sy) * S + (x * SS + sx)) * 4
          r += buf[j]
          g += buf[j + 1]
          b += buf[j + 2]
          a += buf[j + 3]
        }
      }
      const n = SS * SS
      const o = (y * size + x) * 4
      out[o] = Math.round(r / n)
      out[o + 1] = Math.round(g / n)
      out[o + 2] = Math.round(b / n)
      out[o + 3] = Math.round(a / n)
    }
  }
  return encodePng(size, size, out)
}

const targets = [
  { name: 'pwa-64x64.png', size: 64, padding: 0.04 },
  { name: 'pwa-192x192.png', size: 192, padding: 0.04 },
  { name: 'pwa-512x512.png', size: 512, padding: 0.04 },
  // maskable : plus de marge (safe-zone ~80%), fond plein (pas de coins)
  { name: 'maskable-icon-512x512.png', size: 512, padding: 0.0, maskable: true },
  { name: 'apple-touch-icon-180x180.png', size: 180, padding: 0.0 },
]

for (const t of targets) {
  const png = drawIcon(t.size, { padding: t.maskable ? 0.0 : t.padding })
  writeFileSync(join(publicDir, t.name), png)
  console.log('écrit', t.name, png.length, 'octets')
}
