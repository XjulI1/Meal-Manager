import type { CanonicalUnit } from '../../../../../shared/units/conversions'

export interface MenuSnapshotRecipeItem {
  kind: 'recipe'
  recipeId: string
  servings: number
}

export interface MenuSnapshotIngredientItem {
  kind: 'ingredient'
  ingredientId: string
  /** Already in the ingredient's canonical unit — no scaling applies. */
  quantity: { value: number, unit: CanonicalUnit }
}

export type MenuSnapshotItem = MenuSnapshotRecipeItem | MenuSnapshotIngredientItem

export interface MenuSnapshotSlot {
  items: ReadonlyArray<MenuSnapshotItem>
}

export interface MenuSnapshotInfo {
  id: string
  householdId: string
  slots: ReadonlyArray<MenuSnapshotSlot>
}

/**
 * Narrow port the shopping context uses to look at a menu without
 * depending on the full meal-planning aggregate.
 */
export interface IMenuSnapshotFinder {
  findForGeneration(menuId: string, householdId: string): Promise<MenuSnapshotInfo | null>
}
