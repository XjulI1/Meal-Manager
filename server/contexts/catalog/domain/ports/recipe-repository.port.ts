import type { Recipe } from '../entities/recipe.entity'

export interface RecipeSummary {
  id: string
  title: string
  servings: number
  updatedAt: Date
}

export interface ListRecipesFilter {
  /** Case-insensitive substring search on the title. */
  query?: string
}

export interface IRecipeRepository {
  /** Returns the recipe (with ingredients) if it belongs to the household, otherwise null. */
  findById(id: string, householdId: string): Promise<Recipe | null>

  /** Returns lightweight summaries (no ingredients/instructions) ordered by title. */
  listForHousehold(householdId: string, filter?: ListRecipesFilter): Promise<RecipeSummary[]>

  /** Insert a new recipe and its ingredients atomically. */
  create(recipe: Recipe): Promise<void>

  /** Update an existing recipe (replacing its ingredients) atomically. */
  update(recipe: Recipe): Promise<void>

  /**
   * Delete a recipe belonging to the household. Cascades to recipe ingredients
   * AND removes any menu_slots referencing the recipe (per meal-planning spec —
   * empty slots must not be persisted).
   */
  delete(id: string, householdId: string): Promise<void>
}
