import type { Quantity } from '../../../../../shared/units/quantity'

export interface RecipeSnapshotIngredient {
  ingredientId: string
  quantity: Quantity
}

export interface RecipeSnapshotInfo {
  id: string
  servings: number
  ingredients: ReadonlyArray<RecipeSnapshotIngredient>
}

/**
 * Narrow port the shopping context uses to fetch the recipes referenced
 * by a menu without depending on the full catalog aggregate.
 */
export interface IRecipeSnapshotFinder {
  findManyByIds(ids: ReadonlyArray<string>, householdId: string): Promise<Map<string, RecipeSnapshotInfo>>
}
