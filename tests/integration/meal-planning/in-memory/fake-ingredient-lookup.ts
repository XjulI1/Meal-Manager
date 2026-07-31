import type {
  IIngredientLookup,
  IngredientSummary,
} from '../../../../server/contexts/meal-planning/domain/ports/ingredient-lookup.port'

export class FakeIngredientLookup implements IIngredientLookup {
  private readonly ingredients = new Map<string, IngredientSummary & { householdId: string }>()

  register(summary: IngredientSummary & { householdId: string }): this {
    this.ingredients.set(summary.id, summary)
    return this
  }

  async findById(id: string, householdId: string): Promise<IngredientSummary | null> {
    const ing = this.ingredients.get(id)
    if (!ing || ing.householdId !== householdId) return null
    return ing
  }
}
