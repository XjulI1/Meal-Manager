import { RecipeNotFoundError } from '../../domain/errors/recipe-not-found.error'
import type { IRecipeRepository } from '../../domain/ports/recipe-repository.port'
import { toRecipeView, type RecipeView } from './create-recipe.use-case'

export interface GetRecipeByIdInput {
  householdId: string
  id: string
}

export class GetRecipeByIdUseCase {
  constructor(private readonly recipes: IRecipeRepository) {}

  async execute(input: GetRecipeByIdInput): Promise<RecipeView> {
    const recipe = await this.recipes.findById(input.id, input.householdId)
    if (!recipe) {
      throw new RecipeNotFoundError(input.id)
    }
    return toRecipeView(recipe)
  }
}
