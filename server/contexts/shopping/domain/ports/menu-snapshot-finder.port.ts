export interface MenuSnapshotSlot {
  recipeId: string
  servings: number
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
