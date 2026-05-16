export class DuplicateIngredientNameError extends Error {
  override readonly name = 'DuplicateIngredientNameError'
  constructor(name: string) {
    super(`An ingredient with this name already exists in this household: "${name}"`)
  }
}
