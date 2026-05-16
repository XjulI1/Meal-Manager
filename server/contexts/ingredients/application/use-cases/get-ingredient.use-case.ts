import { IngredientNotFoundError } from '../../domain/errors/ingredient-not-found.error'
import type { IIngredientRepository } from '../../domain/ports/ingredient-repository.port'
import type { IProductRepository } from '../../domain/ports/product-repository.port'
import {
  toIngredientView,
  toProductView,
  type IngredientWithProductsView,
} from './views'

export interface GetIngredientInput {
  householdId: string
  id: string
}

export class GetIngredientUseCase {
  constructor(
    private readonly ingredients: IIngredientRepository,
    private readonly products: IProductRepository,
  ) {}

  async execute(input: GetIngredientInput): Promise<IngredientWithProductsView> {
    const ingredient = await this.ingredients.findById(input.id, input.householdId)
    if (!ingredient) {
      throw new IngredientNotFoundError(input.id)
    }
    const products = await this.products.findByIngredient(ingredient.id, input.householdId)
    return {
      ...toIngredientView(ingredient),
      products: products.map(toProductView),
    }
  }
}
