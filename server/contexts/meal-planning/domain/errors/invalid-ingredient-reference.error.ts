export class InvalidIngredientReferenceError extends Error {
  override readonly name = 'InvalidIngredientReferenceError'
  constructor(readonly ingredientId: string, readonly reason: 'not-found' | 'archived' | 'unit-incompatible') {
    super(`Invalid ingredient reference ${ingredientId}: ${reason}`)
  }
}
