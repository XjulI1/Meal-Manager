/**
 * Raised by `IInventoryItemRepository.insert()` when an INSERT would violate the
 * `UNIQUE (household_id, ingredient_id, location)` constraint. The upsert use
 * case catches this to handle the rare concurrent-write race (two scans of the
 * same product racing each other).
 */
export class DuplicateInventoryLineError extends Error {
  override readonly name = 'DuplicateInventoryLineError'
  constructor(
    readonly householdId: string,
    readonly ingredientId: string,
    readonly location: string,
  ) {
    super(
      `An inventory line already exists for household ${householdId}, `
      + `ingredient ${ingredientId}, location "${location}".`,
    )
  }
}
