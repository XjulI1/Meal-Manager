/**
 * Raised when updating an inventory item's `location` would collide with another
 * existing line for the same `(householdId, ingredientId)`. The user must
 * resolve the conflict manually (consume or delete one of the two lines).
 */
export class LocationConflictError extends Error {
  override readonly name = 'LocationConflictError'
  constructor(
    readonly conflictingLineId: string,
    readonly ingredientId: string,
    readonly targetLocation: string,
  ) {
    super(
      `Another inventory line (${conflictingLineId}) already holds ingredient `
      + `${ingredientId} at location "${targetLocation}".`,
    )
  }
}
