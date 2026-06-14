import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const publicDir = resolve(__dirname, '../../../public')

// Lit la taille déclarée dans l'en-tête IHDR d'un PNG (offsets 16/20, big-endian)
// et vérifie la signature magique. Évite d'ajouter une dépendance d'image.
function readPng(file: string): { width: number; height: number } {
  const buf = readFileSync(resolve(publicDir, file))
  const sig = [137, 80, 78, 71, 13, 10, 26, 10]
  for (let i = 0; i < sig.length; i++) {
    expect(buf[i], `${file} n'a pas une signature PNG valide`).toBe(sig[i])
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

describe('PWA — jeu d’icônes installable', () => {
  // (fichier, taille attendue) — doit rester aligné avec `pwa.manifest.icons`
  // dans nuxt.config.ts et `app.head` (apple-touch-icon + favicons).
  const icons: Array<[string, number]> = [
    ['pwa-192x192.png', 192],
    ['pwa-512x512.png', 512],
    ['maskable-icon-512x512.png', 512],
    ['apple-touch-icon-180x180.png', 180],
    ['favicon-32.png', 32],
    ['favicon-16.png', 16],
  ]

  it.each(icons)('%s est un PNG carré valide aux bonnes dimensions', (file, size) => {
    expect(existsSync(resolve(publicDir, file)), `${file} manquant`).toBe(true)
    const { width, height } = readPng(file)
    expect(width).toBe(size)
    expect(height).toBe(size)
  })

  it('fournit un favicon.svg vectoriel', () => {
    const svg = readFileSync(resolve(publicDir, 'favicon.svg'), 'utf8')
    expect(svg).toMatch(/<svg[\s>]/)
    expect(svg).toMatch(/viewBox/)
  })

  it('fournit un favicon.ico (navigateurs legacy)', () => {
    expect(existsSync(resolve(publicDir, 'favicon.ico'))).toBe(true)
  })

  it('expose une icône maskable 512×512 (masquage adaptatif Android)', () => {
    const { width, height } = readPng('maskable-icon-512x512.png')
    expect(width).toBe(512)
    expect(height).toBe(512)
  })
})
