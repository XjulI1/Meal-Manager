import { describe, expect, it } from 'vitest'
import {
  Allergen,
  ALLERGENS,
  InvalidAllergenError,
  parseAllergenSet,
} from '../../../server/contexts/ingredients/domain/value-objects/allergen.vo'

describe('Allergen', () => {
  it('accepts every documented allergen', () => {
    for (const v of ALLERGENS) {
      expect(Allergen.fromString(v).value).toBe(v)
    }
  })

  it('rejects an unknown value', () => {
    expect(() => Allergen.fromString('shellfish')).toThrow(InvalidAllergenError)
  })
})

describe('parseAllergenSet', () => {
  it('returns the validated set', () => {
    const result = parseAllergenSet(['gluten', 'milk'])
    expect(result).toEqual(['gluten', 'milk'])
  })

  it('deduplicates', () => {
    const result = parseAllergenSet(['gluten', 'gluten', 'milk'])
    expect(result).toHaveLength(2)
    expect(result).toEqual(['gluten', 'milk'])
  })

  it('preserves first-seen order', () => {
    const result = parseAllergenSet(['milk', 'gluten'])
    expect(result).toEqual(['milk', 'gluten'])
  })

  it('throws if any value is invalid', () => {
    expect(() => parseAllergenSet(['gluten', 'shellfish'])).toThrow(InvalidAllergenError)
  })
})
