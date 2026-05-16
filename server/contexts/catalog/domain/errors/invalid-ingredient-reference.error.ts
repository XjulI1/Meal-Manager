export class InvalidIngredientReferenceError extends Error {
  override readonly name = 'InvalidIngredientReferenceError'
  constructor(ingredientId: string, reason: 'not-found' | 'archived' | 'unit-incompatible') {
    super(`Invalid ingredient reference ${ingredientId}: ${reason}`)
  }
}
