export class RecipeNotFoundError extends Error {
  override readonly name = 'RecipeNotFoundError'
  constructor(id: string) {
    super(`Recipe not found: ${id}.`)
  }
}
