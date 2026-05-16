import type { IIngredientRepository } from '../../../ingredients/domain/ports/ingredient-repository.port'
import type {
  IIngredientSummaryFinder,
  IngredientSummarySnapshot,
} from '../../domain/ports/ingredient-summary-finder.port'

/**
 * Bridges the shopping context to the ingredient catalog. Used by the
 * shopping list generation to denormalize name + category onto each
 * persisted item.
 */
export class IngredientsCatalogSummaryFinder implements IIngredientSummaryFinder {
  constructor(private readonly ingredients: IIngredientRepository) {}

  async findByIds(
    ids: ReadonlyArray<string>,
    householdId: string,
  ): Promise<Map<string, IngredientSummarySnapshot>> {
    const result = new Map<string, IngredientSummarySnapshot>()
    const unique = Array.from(new Set(ids))
    await Promise.all(
      unique.map(async (id) => {
        const ing = await this.ingredients.findById(id, householdId)
        if (ing) result.set(id, { id: ing.id, name: ing.name, category: ing.category.value })
      }),
    )
    return result
  }
}
