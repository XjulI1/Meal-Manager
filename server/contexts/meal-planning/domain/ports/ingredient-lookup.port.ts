import type { CanonicalUnit } from '../../../../../shared/units/conversions'

export interface IngredientSummary {
  id: string
  name: string
  category: string
  canonicalUnit: CanonicalUnit
  storage: 'pantry' | 'fridge' | 'freezer'
  archived: boolean
}

/**
 * Narrow port the meal-planning context uses to validate a free-ingredient
 * item (existence, household, canonical unit). Implemented in infrastructure
 * as a thin adapter over the ingredient catalog.
 */
export interface IIngredientLookup {
  findById(id: string, householdId: string): Promise<IngredientSummary | null>
}
