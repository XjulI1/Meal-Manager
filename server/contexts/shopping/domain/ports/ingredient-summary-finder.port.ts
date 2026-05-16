export interface IngredientSummarySnapshot {
  id: string
  name: string
  /** One of the IngredientCategory values; persisted as string in the snapshot. */
  category: string
}

/**
 * Narrow port the shopping context uses to denormalize ingredient name and
 * category into the shopping list snapshot. The snapshot freezes these
 * values at generation time so a later rename does not rewrite history.
 */
export interface IIngredientSummaryFinder {
  findByIds(
    ids: ReadonlyArray<string>,
    householdId: string,
  ): Promise<Map<string, IngredientSummarySnapshot>>
}
