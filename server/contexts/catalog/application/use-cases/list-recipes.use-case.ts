import type { IRecipeRepository } from '../../domain/ports/recipe-repository.port'

export interface ListRecipesInput {
  householdId: string
  query?: string
}

export interface RecipeSummaryView {
  id: string
  title: string
  servings: number
  updatedAt: string
}

export class ListRecipesUseCase {
  constructor(private readonly recipes: IRecipeRepository) {}

  async execute(input: ListRecipesInput): Promise<RecipeSummaryView[]> {
    const summaries = await this.recipes.listForHousehold(input.householdId, {
      query: input.query,
    })
    return summaries.map((s) => ({
      id: s.id,
      title: s.title,
      servings: s.servings,
      updatedAt: s.updatedAt.toISOString(),
    }))
  }
}
