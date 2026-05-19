import type { CanonicalUnit } from '../../../../../shared/units/conversions'

export interface ProductSummary {
  id: string
  ingredientId: string
  /** Pack size expressed in the ingredient's canonical unit. */
  packSize: number
  packUnit: CanonicalUnit
}

/**
 * Look up basic product metadata by id, scoped to a household. Owned by the
 * inventory context — the binding to the ingredients catalog is an adapter
 * wired in the composition root, so inventory use cases never import from
 * `~/server/contexts/ingredients/**`.
 */
export interface IProductLookup {
  findById(productId: string, householdId: string): Promise<ProductSummary | null>
}
