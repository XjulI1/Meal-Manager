import type { Recipe } from '../../../../server/contexts/catalog/domain/entities/recipe.entity'
import type {
  IRecipeRepository,
  ListRecipesFilter,
  RecipeSummary,
} from '../../../../server/contexts/catalog/domain/ports/recipe-repository.port'

export class InMemoryRecipeRepository implements IRecipeRepository {
  private readonly recipes = new Map<string, Recipe>()
  /** Recipe ids that have been "deleted" — useful to assert cascade behaviour. */
  readonly deletedSlotRecipeIds = new Set<string>()

  async findById(id: string, householdId: string): Promise<Recipe | null> {
    const recipe = this.recipes.get(id)
    if (!recipe || recipe.householdId !== householdId) return null
    return recipe
  }

  async listForHousehold(
    householdId: string,
    filter: ListRecipesFilter = {},
  ): Promise<RecipeSummary[]> {
    const out: RecipeSummary[] = []
    const needle = filter.query?.trim().toLowerCase()
    for (const recipe of this.recipes.values()) {
      if (recipe.householdId !== householdId) continue
      if (needle && !recipe.title.toLowerCase().includes(needle)) continue
      out.push({
        id: recipe.id,
        title: recipe.title,
        servings: recipe.servings,
        updatedAt: recipe.updatedAt,
      })
    }
    return out.sort((a, b) => a.title.localeCompare(b.title))
  }

  async create(recipe: Recipe): Promise<void> {
    if (this.recipes.has(recipe.id)) {
      throw new Error(`Recipe already exists: ${recipe.id}`)
    }
    this.recipes.set(recipe.id, recipe)
  }

  async update(recipe: Recipe): Promise<void> {
    if (!this.recipes.has(recipe.id)) {
      throw new Error(`Cannot update unknown recipe: ${recipe.id}`)
    }
    this.recipes.set(recipe.id, recipe)
  }

  async delete(id: string, householdId: string): Promise<void> {
    const existing = this.recipes.get(id)
    if (existing && existing.householdId === householdId) {
      this.recipes.delete(id)
      this.deletedSlotRecipeIds.add(id)
    }
  }
}
