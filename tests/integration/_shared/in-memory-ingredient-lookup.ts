import type { IIngredientLookup as InventoryLookup, IngredientSummary } from '../../../server/contexts/inventory/domain/ports/ingredient-lookup.port'
import type { IIngredientLookup as CatalogLookup } from '../../../server/contexts/catalog/domain/ports/ingredient-lookup.port'

/**
 * In-memory fake satisfying both inventory and catalog lookup ports. Used by
 * tests that exercise use cases requiring ingredient metadata without spinning
 * up the full ingredients context.
 */
export class InMemoryIngredientLookup implements InventoryLookup, CatalogLookup {
  /** Composite key `${householdId}|${id}` → summary. */
  private readonly store = new Map<string, IngredientSummary>()

  add(householdId: string, summary: IngredientSummary): void {
    this.store.set(`${householdId}|${summary.id}`, summary)
  }

  async findById(id: string, householdId: string): Promise<IngredientSummary | null> {
    return this.store.get(`${householdId}|${id}`) ?? null
  }

  async findByIds(ids: readonly string[], householdId: string): Promise<Map<string, IngredientSummary>> {
    const result = new Map<string, IngredientSummary>()
    for (const id of ids) {
      const s = this.store.get(`${householdId}|${id}`)
      if (s) result.set(id, s)
    }
    return result
  }
}
