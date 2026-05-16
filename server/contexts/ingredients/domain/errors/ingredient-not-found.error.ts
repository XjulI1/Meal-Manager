export class IngredientNotFoundError extends Error {
  override readonly name = 'IngredientNotFoundError'
  constructor(id: string) {
    super(`Ingredient not found: ${id}`)
  }
}
