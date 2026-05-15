import { RecipeNotFoundError } from '../../domain/errors/recipe-not-found.error'
import type { IRecipeRepository } from '../../domain/ports/recipe-repository.port'

export interface DeleteRecipeInput {
  householdId: string
  id: string
}

export class DeleteRecipeUseCase {
  constructor(private readonly recipes: IRecipeRepository) {}

  async execute(input: DeleteRecipeInput): Promise<void> {
    const existing = await this.recipes.findById(input.id, input.householdId)
    if (!existing) {
      throw new RecipeNotFoundError(input.id)
    }
    await this.recipes.delete(input.id, input.householdId)
  }
}
