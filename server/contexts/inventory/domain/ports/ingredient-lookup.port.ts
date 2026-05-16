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
 * Look up basic metadata of one or more ingredients by id. Owned by the
 * inventory context (port pattern) — the binding to the ingredient catalog
 * is an adapter wired in the composition root.
 */
export interface IIngredientLookup {
  findById(id: string, householdId: string): Promise<IngredientSummary | null>
  /** Returns a map id → summary. Missing ids are simply absent from the map. */
  findByIds(ids: readonly string[], householdId: string): Promise<Map<string, IngredientSummary>>
}
