import type { IIngredientRepository } from '../../domain/ports/ingredient-repository.port'
import type { IngredientCategoryValue } from '../../domain/value-objects/ingredient-category.vo'
import { toIngredientView, type IngredientView } from './views'

export interface ListIngredientsInput {
  householdId: string
  q?: string
  category?: IngredientCategoryValue
  storage?: 'pantry' | 'fridge' | 'freezer'
  includeArchived?: boolean
}

export class ListIngredientsUseCase {
  constructor(private readonly ingredients: IIngredientRepository) {}

  async execute(input: ListIngredientsInput): Promise<IngredientView[]> {
    const items = await this.ingredients.listForHousehold(input.householdId, {
      q: input.q,
      category: input.category,
      storage: input.storage,
      includeArchived: input.includeArchived,
    })
    return items.map(toIngredientView)
  }
}
