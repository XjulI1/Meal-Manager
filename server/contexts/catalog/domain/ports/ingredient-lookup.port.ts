import type { CanonicalUnit } from '../../../../../shared/units/conversions'

export interface IngredientSummary {
  id: string
  name: string
  category: string
  canonicalUnit: CanonicalUnit
  storage: 'pantry' | 'fridge' | 'freezer'
  archived: boolean
}

/** Same shape as the inventory port; owned by catalog (port pattern). */
export interface IIngredientLookup {
  findById(id: string, householdId: string): Promise<IngredientSummary | null>
  findByIds(ids: readonly string[], householdId: string): Promise<Map<string, IngredientSummary>>
  /**
   * Look up an active (non-archived) ingredient by name in the household
   * (case-insensitive, trimmed). Used by the recipe-draft resolver to match
   * AI-generated ingredient names against the catalog.
   */
  findActiveByNameInHousehold(name: string, householdId: string): Promise<IngredientSummary | null>
}
