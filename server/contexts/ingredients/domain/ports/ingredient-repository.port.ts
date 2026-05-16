import type { Ingredient } from '../entities/ingredient.entity'
import type { IngredientCategoryValue } from '../value-objects/ingredient-category.vo'

export interface ListIngredientsFilter {
  /** Substring match (case-insensitive) on name OR aliases. */
  q?: string
  category?: IngredientCategoryValue
  storage?: 'pantry' | 'fridge' | 'freezer'
  /** If false (default), excludes soft-deleted rows. */
  includeArchived?: boolean
}

export interface IIngredientRepository {
  findById(id: string, householdId: string): Promise<Ingredient | null>

  /**
   * Look up an active ingredient by name in the household (case-insensitive,
   * trimmed). Used by uniqueness checks.
   */
  findActiveByNameInHousehold(name: string, householdId: string): Promise<Ingredient | null>

  listForHousehold(householdId: string, filter?: ListIngredientsFilter): Promise<Ingredient[]>

  /** Insert or update an ingredient (also replaces its aliases atomically). */
  save(ingredient: Ingredient): Promise<void>

  /**
   * Returns true if any row in `inventory_item`, `recipe_ingredient`, or
   * `shopping_list_item` references this ingredient (used to decide between
   * hard-delete and soft-delete).
   */
  isReferenced(id: string, householdId: string): Promise<boolean>

  /** Hard-delete (cascades to aliases and products). */
  hardDelete(id: string, householdId: string): Promise<void>
}
