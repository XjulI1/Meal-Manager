export class CanonicalUnitLockedError extends Error {
  override readonly name = 'CanonicalUnitLockedError'
  constructor(ingredientId: string) {
    super(
      `Cannot change the canonical unit of ingredient ${ingredientId}: it is already in use (referenced by products, inventory items, recipes, or shopping lists).`,
    )
  }
}
