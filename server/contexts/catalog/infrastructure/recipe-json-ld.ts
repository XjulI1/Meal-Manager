import { lookupUnit } from '../../../../shared/units/conversions'
import type { RecipeDraft, RecipeIngredientDraft } from '../domain/ports/recipe-importer'

/**
 * Pure parser: extract a schema.org `Recipe` from a page's JSON-LD blocks and
 * map it to a RecipeDraft. Returns null when no usable Recipe data is present.
 * Side-effect free so it can be unit-tested without any network.
 */
export function parseRecipeJsonLd(html: string): RecipeDraft | null {
  for (const raw of extractJsonLdBlocks(html)) {
    const node = findRecipeNode(raw)
    if (node) return recipeNodeToDraft(node)
  }
  return null
}

/**
 * Parse a free-text ingredient line into a draft (best-effort).
 * "200 g de farine" → { name: "farine", quantity: { value: 200, unit: "g" } }
 * "3 oeufs"         → { name: "oeufs", quantity: { value: 3, unit: "unit" } }
 * "Sel"             → { name: "Sel" } (no quantity)
 */
export function parseIngredientLine(raw: string): RecipeIngredientDraft {
  const text = raw.trim().replace(/\s+/g, ' ')
  const match = text.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/)
  if (!match) return { name: text, raw: text }

  const value = Number(match[1]!.replace(',', '.'))
  let rest = (match[2] ?? '').trim()
  if (!Number.isFinite(value) || rest.length === 0) return { name: text, raw: text }

  // A leading token that is a recognized unit becomes the quantity unit.
  const parts = rest.split(' ')
  let unit = 'unit'
  if (parts.length > 1 && isKnownUnit(parts[0]!)) {
    unit = parts[0]!.toLowerCase()
    rest = parts.slice(1).join(' ')
  }
  // Drop a leading French "de "/"d'" connector.
  rest = rest.replace(/^d[e']\s*/i, '').trim()
  if (rest.length === 0) return { name: text, raw: text }

  return { name: rest, quantity: { value, unit }, raw: text }
}

function isKnownUnit(token: string): boolean {
  try {
    lookupUnit(token)
    return true
  }
  catch {
    return false
  }
}

// --- internals --------------------------------------------------------------

function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = []
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const body = (m[1] ?? '').trim()
    if (!body) continue
    try {
      blocks.push(JSON.parse(body))
    }
    catch {
      // Ignore malformed blocks; a page may carry several, only some valid.
    }
  }
  return blocks
}

/** Walk a parsed JSON-LD value (object, array, or `@graph`) for a Recipe node. */
function findRecipeNode(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecipeNode(item)
      if (found) return found
    }
    return null
  }
  if (!isRecord(value)) return null
  if (typeHasRecipe(value['@type'])) return value
  if ('@graph' in value) return findRecipeNode(value['@graph'])
  return null
}

function typeHasRecipe(type: unknown): boolean {
  if (typeof type === 'string') return type.toLowerCase() === 'recipe'
  if (Array.isArray(type)) return type.some((t) => typeof t === 'string' && t.toLowerCase() === 'recipe')
  return false
}

function recipeNodeToDraft(node: Record<string, unknown>): RecipeDraft {
  const title = asString(node.name)?.trim() || 'Recette importée'
  const instructions = parseInstructions(node.recipeInstructions) || 'Instructions non disponibles.'
  const ingredients = toArray(node.recipeIngredient)
    .map(asString)
    .filter((s): s is string => !!s && s.trim().length > 0)
    .map(parseIngredientLine)
  const servings = parseYield(node.recipeYield)
  return { title, instructions, ingredients, ...(servings ? { servings } : {}) }
}

function parseInstructions(value: unknown): string {
  if (typeof value === 'string') return stripTags(value).trim()
  if (Array.isArray(value)) {
    const steps = value
      .map((step) => {
        if (typeof step === 'string') return stripTags(step)
        if (isRecord(step)) return asString(step.text) ?? asString(step.name) ?? ''
        return ''
      })
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    return steps.join('\n')
  }
  return ''
}

function parseYield(value: unknown): number | undefined {
  const candidate = Array.isArray(value) ? value[0] : value
  if (typeof candidate === 'number' && Number.isInteger(candidate) && candidate > 0) return candidate
  const str = asString(candidate)
  if (!str) return undefined
  const m = str.match(/\d+/)
  if (!m) return undefined
  const n = Number(m[0])
  return Number.isInteger(n) && n > 0 ? n : undefined
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, '')
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function toArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v
  if (v === undefined || v === null) return []
  return [v]
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
