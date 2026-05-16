import { describe, expect, it } from 'vitest'
import {
  compareCategories,
  IngredientCategory,
  INGREDIENT_CATEGORIES,
  InvalidIngredientCategoryError,
} from '../../../server/contexts/ingredients/domain/value-objects/ingredient-category.vo'

describe('IngredientCategory', () => {
  it('accepts every documented category', () => {
    for (const v of INGREDIENT_CATEGORIES) {
      expect(IngredientCategory.fromString(v).value).toBe(v)
    }
  })

  it('rejects an unknown value', () => {
    expect(() => IngredientCategory.fromString('snacks')).toThrow(InvalidIngredientCategoryError)
  })

  it('exposes a stable in-store sort order', () => {
    const dairy = IngredientCategory.fromString('dairy')
    const produce = IngredientCategory.fromString('produce')
    expect(produce.sortOrder).toBeLessThan(dairy.sortOrder)
  })

  it('places `other` last', () => {
    const other = IngredientCategory.fromString('other')
    for (const v of INGREDIENT_CATEGORIES) {
      if (v === 'other') continue
      expect(IngredientCategory.fromString(v).sortOrder).toBeLessThan(other.sortOrder)
    }
  })
})

describe('compareCategories', () => {
  it('sorts in the canonical order', () => {
    const shuffled = ['other', 'dairy', 'produce', 'beverages', 'bakery'] as const
    const sorted = [...shuffled].sort(compareCategories)
    expect(sorted).toEqual(['produce', 'bakery', 'dairy', 'beverages', 'other'])
  })
})
