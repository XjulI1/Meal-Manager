export class RecipeDraftNotFoundError extends Error {
  override readonly name = 'RecipeDraftNotFoundError'
  constructor(id: string) {
    super(`Recipe draft not found: ${id}.`)
  }
}
