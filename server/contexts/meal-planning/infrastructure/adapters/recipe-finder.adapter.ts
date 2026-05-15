import type { IRecipeRepository } from '../../../catalog/domain/ports/recipe-repository.port'
import type { IRecipeFinder } from '../../domain/ports/recipe-finder.port'

/**
 * Thin adapter that wraps the catalog's IRecipeRepository so the
 * meal-planning context only sees the narrow `existsInHousehold` capability.
 */
export class CatalogRecipeFinder implements IRecipeFinder {
  constructor(private readonly recipes: IRecipeRepository) {}

  async existsInHousehold(recipeId: string, householdId: string): Promise<boolean> {
    const recipe = await this.recipes.findById(recipeId, householdId)
    return recipe !== null
  }
}
