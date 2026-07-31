import type { IIngredientLookup as CatalogLookup, IngredientSummary } from '../../catalog/domain/ports/ingredient-lookup.port'
import type { IIngredientLookup as InventoryLookup } from '../../inventory/domain/ports/ingredient-lookup.port'
import type { IIngredientLookup as MealPlanningLookup } from '../../meal-planning/domain/ports/ingredient-lookup.port'
import type { IIngredientRepository } from '../domain/ports/ingredient-repository.port'

/**
 * Adapter implementing the inventory, catalog and meal-planning
 * `IIngredientLookup` ports by querying the ingredient catalog. Registered
 * in the composition root so cross-context callers never import from
 * `ingredients/`.
 */
export class IngredientLookupAdapter implements InventoryLookup, CatalogLookup, MealPlanningLookup {
  constructor(private readonly ingredients: IIngredientRepository) {}

  async findById(id: string, householdId: string): Promise<IngredientSummary | null> {
    const ing = await this.ingredients.findById(id, householdId)
    if (!ing) return null
    return {
      id: ing.id,
      name: ing.name,
      category: ing.category.value,
      canonicalUnit: ing.canonicalUnit,
      storage: ing.storage,
      archived: ing.archived,
    }
  }

  async findActiveByNameInHousehold(name: string, householdId: string): Promise<IngredientSummary | null> {
    const ing = await this.ingredients.findActiveByNameInHousehold(name, householdId)
    if (!ing) return null
    return {
      id: ing.id,
      name: ing.name,
      category: ing.category.value,
      canonicalUnit: ing.canonicalUnit,
      storage: ing.storage,
      archived: ing.archived,
    }
  }

  async findByIds(ids: readonly string[], householdId: string): Promise<Map<string, IngredientSummary>> {
    const result = new Map<string, IngredientSummary>()
    if (ids.length === 0) return result
    // Simple implementation: parallel lookups. The set is bounded by recipe
    // ingredient counts (≤100 per recipe) or by inventory page sizes — fine in v1.
    const unique = Array.from(new Set(ids))
    await Promise.all(
      unique.map(async (id) => {
        const summary = await this.findById(id, householdId)
        if (summary) result.set(id, summary)
      }),
    )
    return result
  }
}
