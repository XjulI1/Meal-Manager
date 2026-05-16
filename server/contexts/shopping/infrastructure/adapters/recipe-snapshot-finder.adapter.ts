import type { IRecipeRepository } from '../../../catalog/domain/ports/recipe-repository.port'
import type {
  IRecipeSnapshotFinder,
  RecipeSnapshotInfo,
} from '../../domain/ports/recipe-snapshot-finder.port'

export class CatalogRecipeSnapshotFinder implements IRecipeSnapshotFinder {
  constructor(private readonly recipes: IRecipeRepository) {}

  async findManyByIds(
    ids: ReadonlyArray<string>,
    householdId: string,
  ): Promise<Map<string, RecipeSnapshotInfo>> {
    const out = new Map<string, RecipeSnapshotInfo>()
    await Promise.all(ids.map(async (id) => {
      const recipe = await this.recipes.findById(id, householdId)
      if (recipe) {
        out.set(recipe.id, {
          id: recipe.id,
          servings: recipe.servings,
          ingredients: recipe.ingredients.map((ing) => ({
            ingredientId: ing.ingredientId,
            quantity: ing.quantity,
          })),
        })
      }
    }))
    return out
  }
}
