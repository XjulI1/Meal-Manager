import { RecipeNotFoundError } from '../../domain/errors/recipe-not-found.error'
import type { IIngredientLookup } from '../../domain/ports/ingredient-lookup.port'
import type { IRecipeRepository } from '../../domain/ports/recipe-repository.port'
import { toRecipeView, type RecipeView } from './create-recipe.use-case'

export interface GetRecipeByIdInput {
  householdId: string
  id: string
}

export class GetRecipeByIdUseCase {
  constructor(
    private readonly recipes: IRecipeRepository,
    private readonly ingredientLookup: IIngredientLookup,
  ) {}

  async execute(input: GetRecipeByIdInput): Promise<RecipeView> {
    const recipe = await this.recipes.findById(input.id, input.householdId)
    if (!recipe) {
      throw new RecipeNotFoundError(input.id)
    }
    const summaries = await this.ingredientLookup.findByIds(
      recipe.ingredients.map((i) => i.ingredientId),
      input.householdId,
    )
    return toRecipeView(recipe, summaries)
  }
}
