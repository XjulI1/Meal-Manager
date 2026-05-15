export class RecipeNotInHouseholdError extends Error {
  override readonly name = 'RecipeNotInHouseholdError'
  constructor(recipeId: string) {
    super(`Recipe ${recipeId} does not belong to this household.`)
  }
}
